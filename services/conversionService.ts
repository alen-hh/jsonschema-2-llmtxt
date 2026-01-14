
import { OpenAPISpec } from "../types";

/**
 * Local conversion logic for OpenAPI JSON to llm.txt format.
 */
export const localConvertToLlmTxt = (jsonContent: string): string => {
  let spec: OpenAPISpec;
  try {
    spec = JSON.parse(jsonContent);
  } catch (e) {
    throw new Error("Invalid JSON format");
  }

  const lines: string[] = [];

  // Title and Summary
  lines.push(`# ${spec.info.title || 'API Documentation'}`);
  lines.push(`${spec.info.description || 'No description provided.'}`);
  lines.push('');

  // Endpoints Section
  lines.push('## Endpoints');
  lines.push('');

  const paths = spec.paths || {};
  const baseUrl = (spec as any).servers?.[0]?.url || 'https://api.example.com';

  Object.entries(paths).forEach(([path, methods]) => {
    Object.entries(methods as Record<string, any>).forEach(([method, details]) => {
      const lowerMethod = method.toLowerCase();
      if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(lowerMethod)) {
        const op = details as any;
        const summary = op.summary || op.operationId || 'No summary';
        
        lines.push(`### ${method.toUpperCase()} ${path} - ${summary}`);
        if (op.description) lines.push(op.description);
        lines.push('');

        // --- INPUT SECTION ---
        lines.push('#### Input');
        
        const parameters = op.parameters || [];
        if (parameters.length > 0) {
          lines.push('**Parameters:**');
          parameters.forEach((p: any) => {
            const pAny = p as any;
            const schema = pAny.schema || {};
            const type = schema.type || pAny.type || 'unknown';
            const def = schema.default !== undefined ? schema.default : pAny.default;
            const enums = schema.enum || pAny.enum;
            const format = schema.format || pAny.format;
            const min = schema.minimum !== undefined ? schema.minimum : pAny.minimum;
            const max = schema.maximum !== undefined ? schema.maximum : pAny.maximum;
            
            let metadata = `${pAny.in}, \`${type}\``;
            if (format) metadata += `, format: \`${format}\``;
            if (min !== undefined) metadata += `, min: \`${min}\``;
            if (max !== undefined) metadata += `, max: \`${max}\``;
            if (def !== undefined) metadata += `, default: \`${JSON.stringify(def)}\``;
            if (enums && Array.isArray(enums)) metadata += `, enum: [${enums.map((e: any) => `\`${JSON.stringify(e)}\``).join(', ')}]`;
            
            const reqStr = pAny.required ? '**Required**' : 'Optional';
            lines.push(`- \`${pAny.name}\` [${reqStr}] (${metadata}): ${pAny.description || 'No description'}`);
          });
        }

        const requestBody = op.requestBody;
        let bodySchema: any = null;
        if (requestBody) {
          lines.push('**Request Body:**');
          const content = (requestBody.content || {}) as any;
          bodySchema = content['application/json']?.schema || content['*/*']?.schema || (Object.values(content)[0] as any)?.schema;
          if (bodySchema) {
            parseSchema(bodySchema, spec, lines, 0);
          } else {
            const types = Object.keys(content).join(', ');
            lines.push(`- *Content types: ${types || 'Unknown'} (No schema defined)*`);
          }
        }

        if (parameters.length === 0 && !requestBody) {
          lines.push('- No input parameters required.');
        }
        lines.push('');

        // --- EXAMPLES (INPUT) ---
        if (bodySchema) {
          const requiredEx = generateExample(bodySchema, spec, true);
          const fullEx = generateExample(bodySchema, spec, false);

          if (Object.keys(requiredEx).length > 0) {
            lines.push('**Required Parameters Example**:');
            lines.push('```json');
            lines.push(JSON.stringify(requiredEx, null, 2));
            lines.push('```');
            lines.push('');
          }

          lines.push('**Full Example**:');
          lines.push('```json');
          lines.push(JSON.stringify(fullEx, null, 2));
          lines.push('```');
          lines.push('');
        }

        // --- OUTPUT SECTION ---
        lines.push('#### Output');
        const responses = op.responses || {};
        
        if (Object.keys(responses).length > 0) {
          Object.entries(responses).forEach(([code, response]: [string, any]) => {
            const desc = response.description || 'No description';
            lines.push(`**Response ${code}: ${desc}**`);
            
            const content = (response.content || {}) as any;
            const jsonSchema = content['application/json']?.schema || content['*/*']?.schema || (Object.values(content)[0] as any)?.schema;
            
            if (jsonSchema) {
              parseSchema(jsonSchema, spec, lines, 1);
              
              // Add Response Example
              const respEx = (content['application/json']?.example || content['application/json']?.examples?.[0]?.value) || generateExample(jsonSchema, spec, false);
              if (respEx && Object.keys(respEx).length > 0) {
                lines.push('  **Example Response**:');
                lines.push('  ```json');
                lines.push(JSON.stringify(respEx, null, 2).split('\n').map(l => '  ' + l).join('\n'));
                lines.push('  ```');
              }
            } else if (response.$ref) {
              parseSchema(response, spec, lines, 1);
            } else {
              lines.push('  - No response body schema defined.');
            }
            lines.push('');
          });
        } else {
          lines.push('- No response documentation provided.');
        }

        // --- USAGE EXAMPLES ---
        lines.push('#### Usage Examples');
        lines.push('');
        lines.push('##### cURL');
        lines.push('```bash');
        let curlCmd = `curl --request ${method.toUpperCase()} \\\n  --url ${baseUrl}${path} \\\n  --header "Content-Type: application/json"`;
        if (bodySchema) {
          const reqEx = generateExample(bodySchema, spec, true);
          curlCmd += ` \\\n  --data '${JSON.stringify(reqEx, null, 2)}'`;
        }
        lines.push(curlCmd);
        lines.push('```');
        lines.push('');

        lines.push('---');
        lines.push('');
      }
    });
  });

  return lines.join('\n');
};

/**
 * Generate a synthetic JSON example from a schema.
 */
function generateExample(schema: any, root: any, onlyRequired: boolean): any {
  if (!schema) return undefined;

  // Resolve Reference
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/', '').split('/');
    let target = root;
    for (const segment of refPath) {
      target = target?.[segment];
    }
    return target ? generateExample(target, root, onlyRequired) : undefined;
  }

  // Handle allOf (merge)
  if (schema.allOf) {
    let merged = {};
    schema.allOf.forEach((sub: any) => {
      const ex = generateExample(sub, root, onlyRequired);
      if (typeof ex === 'object' && ex !== null) merged = { ...merged, ...ex };
    });
    return merged;
  }

  // anyOf / oneOf (take first)
  if (schema.anyOf || schema.oneOf) {
    return generateExample((schema.anyOf || schema.oneOf)[0], root, onlyRequired);
  }

  // Schema Example
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;

  // Type-based generation
  const type = schema.type;
  if (type === 'object' || schema.properties) {
    const obj: any = {};
    const props = schema.properties || {};
    const required = schema.required || [];

    Object.entries(props).forEach(([key, val]: [string, any]) => {
      if (onlyRequired && !required.includes(key)) return;
      obj[key] = generateExample(val, root, onlyRequired);
    });
    return obj;
  }

  if (type === 'array') {
    return [generateExample(schema.items, root, onlyRequired)];
  }

  // Primitives
  if (schema.enum) return schema.enum[0];
  switch (type) {
    case 'string':
      if (schema.format === 'date-time') return new Date().toISOString();
      if (schema.format === 'uri') return "https://example.com";
      return "string";
    case 'integer':
    case 'number':
      return 0;
    case 'boolean':
      return true;
    default:
      return null;
  }
}

/**
 * Helper to resolve $ref and display schema properties with requirements, types, defaults, and enums.
 */
function parseSchema(schema: any, root: any, lines: string[], depth: number) {
  if (!schema) return;

  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/', '').split('/');
    let target = root;
    for (const segment of refPath) {
      target = target?.[segment];
    }
    if (target) {
      parseSchema(target, root, lines, depth);
    } else {
      lines.push(`${'  '.repeat(depth)}- \`Ref: ${schema.$ref}\``);
    }
    return;
  }

  if (schema.allOf || schema.anyOf || schema.oneOf) {
    const label = schema.allOf ? 'All of:' : schema.anyOf ? 'Any of:' : 'One of:';
    lines.push(`${'  '.repeat(depth)}- *${label}*`);
    const subSchemas = schema.allOf || schema.anyOf || schema.oneOf;
    subSchemas.forEach((sub: any) => parseSchema(sub, root, lines, depth + 1));
    return;
  }

  if (schema.type === 'object' || schema.properties) {
    const props = schema.properties || {};
    const requiredFields = schema.required || [];
    
    Object.entries(props).forEach(([key, val]: [string, any]) => {
      const isRequired = requiredFields.includes(key);
      const reqLabel = isRequired ? '**Required**' : 'Optional';
      
      const type = val.type || (val.$ref ? 'object' : 'unknown');
      const def = val.default;
      const enums = val.enum;
      const ex = val.example;
      const format = val.format;
      const min = val.minimum;
      const max = val.maximum;
      
      let metadata = `\`${type}\``;
      if (format) metadata += `, format: \`${format}\``;
      if (min !== undefined) metadata += `, min: \`${min}\``;
      if (max !== undefined) metadata += `, max: \`${max}\``;
      if (def !== undefined) metadata += `, default: \`${JSON.stringify(def)}\``;
      if (enums && Array.isArray(enums)) metadata += `, enum: [${enums.map((e: any) => `\`${JSON.stringify(e)}\``).join(', ')}]`;
      if (ex !== undefined) metadata += `, example: \`${JSON.stringify(ex)}\``;
      
      const desc = val.description ? `: ${val.description}` : '';
      lines.push(`${'  '.repeat(depth)}- \`${key}\` [${reqLabel}] (${metadata})${desc}`);
      
      if (val.type === 'object' || val.properties || val.$ref) {
        parseSchema(val, root, lines, depth + 1);
      } else if (val.type === 'array' && val.items) {
        lines.push(`${'  '.repeat(depth + 1)}*Items:*`);
        parseSchema(val.items, root, lines, depth + 2);
      }
    });
  } 
  else if (schema.type === 'array' && schema.items) {
    const def = schema.default;
    let metadata = 'array';
    if (def !== undefined) metadata += `, default: \`${JSON.stringify(def)}\``;
    lines.push(`${'  '.repeat(depth)}- \`Array\` (${metadata})${schema.description ? `: ${schema.description}` : ''}`);
    parseSchema(schema.items, root, lines, depth + 1);
  }
  else if (schema.type) {
    const def = schema.default;
    const enums = schema.enum;
    const format = schema.format;
    const min = schema.minimum;
    const max = schema.maximum;

    let metadata = `\`${schema.type}\``;
    if (format) metadata += `, format: \`${format}\``;
    if (min !== undefined) metadata += `, min: \`${min}\``;
    if (max !== undefined) metadata += `, max: \`${max}\``;
    if (def !== undefined) metadata += `, default: \`${JSON.stringify(def)}\``;
    if (enums && Array.isArray(enums)) metadata += `, enum: [${enums.map((e: any) => `\`${JSON.stringify(e)}\``).join(', ')}]`;
    lines.push(`${'  '.repeat(depth)}- (${metadata})${schema.description ? `: ${schema.description}` : ''}`);
  }
}
