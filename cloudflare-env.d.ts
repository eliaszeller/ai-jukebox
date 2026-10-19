declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    CLASS_API_KEY?: string;
    QWEN_BASE_URL?: string;
    QWEN_MODEL?: string;
    FLUX_BASE_URL?: string;
    FLUX_MODEL?: string;
    ACESTEP_BASE_URL?: string;
    CHATTERBOX_BASE_URL?: string;
    CHATTERBOX_MODEL?: string;
  }
}
