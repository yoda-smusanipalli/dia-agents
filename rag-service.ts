import Database from 'better-sqlite3';
import { pipeline } from '@xenova/transformers';
// import { HfInference } from '@huggingface/inference';

// Initialize Hugging Face client (for future real dataset loading)
// const HF_TOKEN = process.env.HUGGINGFACE_TOKEN || '';
// const hf = new HfInference(HF_TOKEN);

// Agent-specific Hugging Face datasets
export const AGENT_DATASETS = {
  iac: [
    'aws/aws-documentation',
    'terraform/terraform-docs',
    'kubernetes/kubernetes-docs',
    'cloudformation/cloudformation-examples'
  ],
  sre: [
    'datadog/sre-best-practices',
    'google/sre-workbook',
    'prometheus/alerting-rules',
    'incident-io/incident-response-guide'
  ],
  cicd: [
    'github/actions-examples',
    'gitlab/ci-templates',
    'jenkins/pipeline-examples',
    'circleci/config-examples'
  ],
  aidlc: [
    'huggingface/mlops-best-practices',
    'databricks/ml-lifecycle',
    'weights-biases/experiment-tracking',
    'mlflow/model-registry'
  ],
  aidc: [
    'anthropic/prompt-engineering',
    'openai/best-practices',
    'langchain/agent-patterns',
    'semantic-kernel/planning'
  ],
  devprod: [
    'bigcode/the-stack-smol',
    'codeparrot/github-code',
    'nyu-mll/multi_nli',
    'sahil2801/CodeAlpaca-20k',
    'iamtarun/python_code_instructions_18k_alpaca'
  ]
};

// Initialize embedding model (cached)
let embeddingModel: any = null;

async function getEmbeddingModel() {
  if (!embeddingModel) {
    console.log('[RAG] Loading embedding model...');
    embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('[RAG] Embedding model loaded');
  }
  return embeddingModel;
}

// Generate embeddings for text
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = await getEmbeddingModel();
  const output = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// Cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// RAG Service Class
export class RAGService {
  private db: Database.Database;

  constructor(dbPath: string = './rag.db') {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase() {
    // Knowledge base table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_type TEXT NOT NULL,
        source TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_agent_type ON knowledge_base(agent_type);
      CREATE INDEX IF NOT EXISTS idx_source ON knowledge_base(source);

      -- Training status table
      CREATE TABLE IF NOT EXISTS training_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_type TEXT NOT NULL,
        dataset_name TEXT NOT NULL,
        status TEXT NOT NULL,
        documents_processed INTEGER DEFAULT 0,
        total_documents INTEGER DEFAULT 0,
        error_message TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      );
    `);

    console.log('[RAG] Database initialized');
  }

  // Load dataset from Hugging Face
  async loadHuggingFaceDataset(
    agentType: 'iac' | 'sre' | 'cicd' | 'aidlc' | 'aidc' | 'devprod',
    datasetName: string,
    maxDocs: number = 100
  ): Promise<void> {
    const trainingId = this.db.prepare(`
      INSERT INTO training_status (agent_type, dataset_name, status, total_documents)
      VALUES (?, ?, 'running', ?)
    `).run(agentType, datasetName, maxDocs).lastInsertRowid as number;

    try {
      console.log(`[RAG] Loading dataset: ${datasetName} for ${agentType}`);

      // Try loading from Hugging Face API first, fallback to synthetic data
      let docs: Array<{ content: string; metadata?: any }>;
      try {
        docs = await this.fetchHuggingFaceDataset(datasetName, agentType, maxDocs);
        console.log(`[RAG] Loaded ${docs.length} documents from Hugging Face: ${datasetName}`);
      } catch (hfError: any) {
        console.log(`[RAG] Hugging Face fetch failed (${hfError.message}), using synthetic data for ${datasetName}`);
        docs = await this.generateSyntheticTrainingData(agentType, datasetName, maxDocs);
      }
      const syntheticDocs = docs;

      let processed = 0;
      for (const doc of syntheticDocs) {
        // Generate embedding
        const embedding = await generateEmbedding(doc.content);

        // Store in database
        this.db.prepare(`
          INSERT INTO knowledge_base (agent_type, source, content, embedding, metadata)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          agentType,
          datasetName,
          doc.content,
          JSON.stringify(embedding),
          JSON.stringify(doc.metadata || {})
        );

        processed++;

        // Update progress
        this.db.prepare(`
          UPDATE training_status
          SET documents_processed = ?
          WHERE id = ?
        `).run(processed, trainingId);
      }

      // Mark as complete
      this.db.prepare(`
        UPDATE training_status
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(trainingId);

      console.log(`[RAG] Completed loading ${processed} documents for ${agentType}`);

    } catch (error: any) {
      console.error(`[RAG] Error loading dataset:`, error);

      this.db.prepare(`
        UPDATE training_status
        SET status = 'failed', error_message = ?, completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(error.message, trainingId);

      throw error;
    }
  }

  // Fetch real data from Hugging Face API
  private async fetchHuggingFaceDataset(
    datasetName: string,
    agentType: string,
    maxDocs: number
  ): Promise<Array<{ content: string; metadata?: any }>> {
    const HF_TOKEN = process.env.HUGGINGFACE_TOKEN || '';
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    if (HF_TOKEN) {
      headers['Authorization'] = `Bearer ${HF_TOKEN}`;
    }

    // Try the dataset viewer API (rows endpoint)
    const apiUrl = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(datasetName)}&config=default&split=train&offset=0&length=${maxDocs}`;
    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      // Try without config
      const altUrl = `https://datasets-server.huggingface.co/first-rows?dataset=${encodeURIComponent(datasetName)}&config=default&split=train`;
      const altResponse = await fetch(altUrl, { headers });

      if (!altResponse.ok) {
        throw new Error(`HF API returned ${response.status}: ${response.statusText}`);
      }

      const altData = await altResponse.json();
      if (!altData.rows || altData.rows.length === 0) {
        throw new Error('No rows returned from HF API');
      }

      return altData.rows.slice(0, maxDocs).map((row: any, idx: number) => {
        const rowData = row.row || row;
        const content = this.extractContentFromRow(rowData, agentType);
        return {
          content,
          metadata: { source: datasetName, index: idx, agentType, origin: 'huggingface' }
        };
      });
    }

    const data = await response.json();
    if (!data.rows || data.rows.length === 0) {
      throw new Error('No rows returned from HF API');
    }

    return data.rows.slice(0, maxDocs).map((row: any, idx: number) => {
      const rowData = row.row || row;
      const content = this.extractContentFromRow(rowData, agentType);
      return {
        content,
        metadata: { source: datasetName, index: idx, agentType, origin: 'huggingface' }
      };
    });
  }

  // Extract meaningful content from a HF dataset row
  private extractContentFromRow(row: any, agentType: string): string {
    // Try common field names for code/text datasets
    const textFields = ['content', 'text', 'instruction', 'input', 'output', 'code', 'prompt', 'completion', 'response', 'question', 'answer', 'premise', 'hypothesis'];

    const parts: string[] = [];
    for (const field of textFields) {
      if (row[field] && typeof row[field] === 'string' && row[field].trim().length > 0) {
        parts.push(row[field].trim());
      }
    }

    if (parts.length > 0) {
      return parts.join('\n\n').substring(0, 2000); // Limit to 2000 chars
    }

    // Fallback: stringify all string fields
    const allStrings = Object.entries(row)
      .filter(([_, v]) => typeof v === 'string' && (v as string).length > 10)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return allStrings.substring(0, 2000) || JSON.stringify(row).substring(0, 2000);
  }

  // Generate synthetic training data (fallback for when HF API is unavailable)
  private async generateSyntheticTrainingData(
    agentType: string,
    datasetName: string,
    count: number
  ): Promise<Array<{ content: string; metadata?: any }>> {
    const templates: Record<string, string[]> = {
      iac: [
        'Best practices for Terraform state management include using remote backends like S3 with DynamoDB for state locking. Always encrypt state files and never commit them to version control.',
        'AWS CloudFormation stack policies prevent accidental updates or deletions of critical resources. Use StackSets for multi-account deployments and nested stacks for modular infrastructure.',
        'Kubernetes resource limits and requests ensure fair scheduling. Set memory and CPU limits to prevent resource exhaustion. Use namespace quotas for multi-tenant clusters.',
        'Infrastructure testing with tools like Terratest validates your IaC before deployment. Write unit tests for modules and integration tests for complete stacks.',
        'GitOps workflows with ArgoCD or Flux enable declarative infrastructure management. Store all infrastructure code in Git and let controllers sync the desired state.',
      ],
      sre: [
        'SLO (Service Level Objective) defines the target reliability for a service. Calculate error budget as 1 - SLO to determine acceptable downtime. Review SLOs quarterly.',
        'Incident response requires clear escalation paths and runbooks. Use incident.io or PagerDuty for coordination. Conduct blameless postmortems within 48 hours of incidents.',
        'Monitoring pyramid: USE (Utilization, Saturation, Errors) for resources and RED (Rate, Errors, Duration) for requests. Alert on symptoms, not causes.',
        'Capacity planning uses historical trends and growth projections. Maintain 20-30% headroom for traffic spikes. Implement auto-scaling with proper warmup times.',
        'Chaos engineering validates system resilience. Start with gamedays in staging, then gradually introduce fault injection in production with proper blast radius controls.',
      ],
      cicd: [
        'CI/CD pipelines should run in under 10 minutes for optimal developer experience. Parallelize tests and use incremental builds. Cache dependencies aggressively.',
        'Deployment strategies: Blue-Green for zero-downtime, Canary for gradual rollout with metrics validation, Rolling for resource-constrained environments.',
        'Security scanning in pipelines: SAST for code analysis, DAST for runtime testing, SCA for dependency vulnerabilities. Fail builds on critical findings.',
        'Artifact versioning with semantic versioning enables reliable rollbacks. Tag images with git SHA and build number. Maintain immutable artifacts.',
        'Pipeline as code with GitHub Actions, GitLab CI, or Jenkins enables version-controlled CI/CD. Use reusable workflows and shared libraries for consistency.',
      ],
      aidlc: [
        'MLOps lifecycle: data validation, model training, evaluation, deployment, monitoring. Use MLflow or W&B for experiment tracking and model registry.',
        'Model versioning tracks training data, code, hyperparameters, and artifacts. Implement lineage tracking for reproducibility and compliance.',
        'A/B testing for ML models compares new versions against baselines. Monitor business metrics alongside model metrics. Implement gradual rollout.',
        'Model monitoring detects data drift, concept drift, and performance degradation. Set up alerts for accuracy drops and feature distribution shifts.',
        'Feature stores centralize feature engineering and enable feature reuse. Use Feast or Tecton for online and offline feature serving.',
      ],
      aidc: [
        'AI-assisted development increases productivity by 30-40%. Use GitHub Copilot for code completion, Claude for architecture design, and AI code review.',
        'Prompt engineering best practices: be specific, provide context, use examples, iteratively refine. Chain prompts for complex tasks.',
        'Code quality with AI: use AI for refactoring suggestions, test generation, and documentation. Always review AI-generated code before merging.',
        'Developer productivity metrics: PR cycle time, code churn, MTTR for bugs. AI reduces review time and accelerates debugging.',
        'AI pair programming: delegate boilerplate to AI, focus on business logic and architecture. Use AI for exploring alternative implementations.',
      ],
      devprod: [
        'AIDLC (AI Development Life Cycle) metrics track the full lifecycle of AI-assisted development: planning with AI, code generation, review, testing, deployment, and maintenance of AI-generated code.',
        'AI code generation rate measures the percentage of code written by AI assistants. Track per developer, per tool (Copilot, Cursor, Claude, Codex, Dira), and per feature to identify adoption patterns.',
        'Tech debt from AI-generated code: AI tools may produce working but suboptimal code. Measure tech debt score using static analysis (SonarQube, CodeClimate) on AI vs human-written code segments.',
        'Token consumption efficiency: Calculate lines of production code per 1000 tokens consumed. Compare across AI tools to determine cost-effectiveness. Average is 15-25 lines per 1000 tokens.',
        'Cost analysis for AI coding assistants: Track per-seat licensing ($10-40/month for Copilot/Cursor), API costs for Claude/Codex ($0.01-0.03 per 1K tokens), and calculate ROI based on velocity gains.',
        'AI code acceptance rate measures how often developers accept AI suggestions vs modify or reject them. High acceptance (>70%) indicates good AI-developer fit. Low rates may indicate poor prompt quality.',
        'Rework ratio for AI code: Track the percentage of AI-generated code that requires significant modification within 30 days. Industry benchmark is 15-25%. Higher ratios indicate quality issues.',
        'Developer satisfaction with AI tools: Survey developers quarterly on AI tool utility (1-10 scale). Correlate with productivity metrics. Satisfaction >7 correlates with sustained adoption.',
        'AI-assisted velocity measures story points completed per sprint with AI tools vs without. Typical improvement is 25-40%. Track velocity delta over time to measure sustained impact.',
        'Code review time reduction with AI: AI-generated code with proper documentation reduces review time by 30-50%. Track PR review duration for AI vs non-AI commits.',
      ]
    };

    const docs = templates[agentType] || templates.iac;
    const result: Array<{ content: string; metadata?: any }> = [];

    for (let i = 0; i < Math.min(count, docs.length * 10); i++) {
      const content = docs[i % docs.length];
      result.push({
        content,
        metadata: {
          source: datasetName,
          index: i,
          agentType
        }
      });
    }

    return result;
  }

  // Retrieve relevant documents
  async retrieveRelevant(
    agentType: string,
    query: string,
    topK: number = 5
  ): Promise<Array<{ content: string; score: number; metadata: any }>> {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Get all documents for this agent type
    const docs = this.db.prepare(`
      SELECT content, embedding, metadata
      FROM knowledge_base
      WHERE agent_type = ?
    `).all(agentType) as Array<{ content: string; embedding: string; metadata: string }>;

    // Calculate similarities
    const results = docs.map(doc => {
      const docEmbedding = JSON.parse(doc.embedding);
      const score = cosineSimilarity(queryEmbedding, docEmbedding);

      return {
        content: doc.content,
        score,
        metadata: JSON.parse(doc.metadata || '{}')
      };
    });

    // Sort by score and return top K
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  // Get training status
  getTrainingStatus(agentType?: string) {
    if (agentType) {
      return this.db.prepare(`
        SELECT * FROM training_status
        WHERE agent_type = ?
        ORDER BY started_at DESC
      `).all(agentType);
    }

    return this.db.prepare(`
      SELECT * FROM training_status
      ORDER BY started_at DESC
      LIMIT 50
    `).all();
  }

  // Get knowledge base stats
  getStats() {
    const stats = this.db.prepare(`
      SELECT
        agent_type,
        COUNT(*) as doc_count,
        MAX(created_at) as last_updated
      FROM knowledge_base
      GROUP BY agent_type
    `).all();

    return stats;
  }

  // Clear knowledge base for an agent
  clearKnowledgeBase(agentType: string) {
    this.db.prepare(`
      DELETE FROM knowledge_base
      WHERE agent_type = ?
    `).run(agentType);

    console.log(`[RAG] Cleared knowledge base for ${agentType}`);
  }
}

// Singleton instance
let ragService: RAGService | null = null;

export function getRagService(): RAGService {
  if (!ragService) {
    ragService = new RAGService();
  }
  return ragService;
}
