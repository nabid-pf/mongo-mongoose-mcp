import { ZodRawShape } from "zod";

export interface ToolDefinition<Args extends ZodRawShape> {
  name: string;
  description: string;
  schema: Args;
  handler: (args: any, extra: { signal: AbortSignal }) => Promise<any>;
}
