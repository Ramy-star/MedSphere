
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `Firestore permission denied for ${context.operation} on ${context.path}`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This is to make the error object serializable and easy to read in Next.js overlay
    this.message = `${message}: ${JSON.stringify({
      ...context,
      requestResourceData: context.requestResourceData ? JSON.stringify(context.requestResourceData, null, 2) : "Not available"
    }, null, 2)}`;
  }
}

