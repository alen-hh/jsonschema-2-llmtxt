
export interface ConversionState {
  isLoading: boolean;
  error: string | null;
  result: string | null;
  fileName: string | null;
}

export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
}

export interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  info: OpenAPIInfo;
  paths: Record<string, any>;
  components?: any;
}
