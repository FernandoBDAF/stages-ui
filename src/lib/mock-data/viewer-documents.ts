// Mock data for the Text Viewer module
// This will be replaced with API calls later

import type { DocumentMeta, DocumentContent } from '@/types/viewer';

// Sample raw transcript text
const RAW_TRANSCRIPT_1 = `um so when we think about artificial intelligence and its implications for society uh John Smith argues that we need to consider not just the immediate benefits but also the long term consequences you know during our conversation in New York last January he mentioned that the concept of responsible AI has evolved significantly over the past decade

so the key challenge he explained is balancing innovation with ethical considerations we cant simply move fast and break things when those things are peoples lives and livelihoods um and I think thats really important

uh Mary Johnson from the Stanford AI Lab also weighed in on this topic she noted that um the regulatory landscape in the European Union particularly with the AI Act is setting new precedents for how we govern these technologies

the discussion then shifted to practical applications in healthcare um Dr Williams from Massachusetts General Hospital described how theyve been using machine learning models to predict patient outcomes with um remarkable accuracy rates of about 94 percent

but he also cautioned that these tools should augment rather than replace human judgment the doctor patient relationship remains fundamental to quality care and no algorithm can fully capture the nuances of individual patient needs

uh looking at the economic implications Sarah Chen an economist at MIT suggested that automation could displace approximately 15 to 20 percent of current jobs over the next two decades however she also noted that new categories of employment will emerge just as they did during previous technological revolutions

the panel concluded with a discussion about education and workforce development participants agreed that um investing in STEM education and reskilling programs will be critical to ensuring that the benefits of AI are broadly shared across society

John Smith summarized it well when he said quote we have a choice to make we can let technology happen to us or we can actively shape it to reflect our values and priorities end quote`;

const CLEANED_TRANSCRIPT_1 = `When we think about artificial intelligence and its implications for society, John Smith argues that we need to consider not just the immediate benefits, but also the long-term consequences. During our conversation in New York last January, he mentioned that the concept of "responsible AI" has evolved significantly over the past decade.

"The key challenge," he explained, "is balancing innovation with ethical considerations. We can't simply move fast and break things when those things are people's lives and livelihoods."

Mary Johnson from the Stanford AI Lab also weighed in on this topic. She noted that the regulatory landscape in the European Union, particularly with the AI Act, is setting new precedents for how we govern these technologies.

The discussion then shifted to practical applications in healthcare. Dr. Williams from Massachusetts General Hospital described how they've been using machine learning models to predict patient outcomes with remarkable accuracy rates of about 94 percent.

However, he also cautioned that these tools should augment rather than replace human judgment. "The doctor-patient relationship remains fundamental to quality care, and no algorithm can fully capture the nuances of individual patient needs."

Looking at the economic implications, Sarah Chen, an economist at MIT, suggested that automation could displace approximately 15 to 20 percent of current jobs over the next two decades. However, she also noted that new categories of employment will emerge, just as they did during previous technological revolutions.

The panel concluded with a discussion about education and workforce development. Participants agreed that investing in STEM education and reskilling programs will be critical to ensuring that the benefits of AI are broadly shared across society.

John Smith summarized it well: "We have a choice to make. We can let technology happen to us, or we can actively shape it to reflect our values and priorities."`;

const RAW_TRANSCRIPT_2 = `okay so today were going to talk about the history of graph databases and knowledge graphs um this is episode 42 of the tech deep dive podcast im your host Michael Torres and joining me today is Dr Lisa Park who is a principal researcher at Neo4j

Lisa thanks for being here today um can you start by giving us some background on how graph databases came to be

sure Michael so graph databases have their roots in the mathematical field of graph theory which dates back to the 18th century with Leonhard Euler and his famous Seven Bridges of Konigsberg problem but the computational applications really started emerging in the 1960s and 70s

uh the first database systems were hierarchical like IBM IMS in 1966 and then network databases came along uh which actually had graph like structures but they were quite rigid and hard to work with

the relational model proposed by Edgar Codd at IBM in 1970 dominated for decades because it was more flexible and easier to query with SQL but as data became more connected um traditional relational databases started showing their limitations

so when did modern graph databases start appearing

well Neo4j which is where I work was founded in 2007 in San Mateo California but the research goes back to around 2000 um other notable graph databases include Amazon Neptune launched in 2017 Microsoft Azure Cosmos DB added graph support in 2017 and TigerGraph emerged in 2012

the real explosion happened with the rise of social networks Facebook Google and LinkedIn all built massive graph systems internally Google's Knowledge Graph launched in 2012 was a watershed moment it fundamentally changed how search engines understand the world

uh speaking of knowledge graphs can you explain the difference between a graph database and a knowledge graph

great question so a graph database is the underlying technology for storing and querying graph structured data nodes edges properties that kind of thing

a knowledge graph is more of an application layer its a way of representing real world entities and their relationships in a semantic meaningful way typically using ontologies and schemas

so you could say a knowledge graph runs on top of a graph database but it adds meaning and context to the data the classic example is Google's Knowledge Graph which connects entities like people places events and concepts to answer questions like who is the CEO of Tesla`;

const CLEANED_TRANSCRIPT_2 = `Today we're going to talk about the history of graph databases and knowledge graphs. This is Episode 42 of the Tech Deep Dive podcast. I'm your host, Michael Torres, and joining me today is Dr. Lisa Park, who is a Principal Researcher at Neo4j.

Lisa, thanks for being here today. Can you start by giving us some background on how graph databases came to be?

"Graph databases have their roots in the mathematical field of graph theory, which dates back to the 18th century with Leonhard Euler and his famous Seven Bridges of Königsberg problem. But the computational applications really started emerging in the 1960s and 70s.

The first database systems were hierarchical, like IBM IMS in 1966, and then network databases came along, which actually had graph-like structures, but they were quite rigid and hard to work with.

The relational model proposed by Edgar Codd at IBM in 1970 dominated for decades because it was more flexible and easier to query with SQL. But as data became more connected, traditional relational databases started showing their limitations."

So when did modern graph databases start appearing?

"Neo4j, which is where I work, was founded in 2007 in San Mateo, California, but the research goes back to around 2000. Other notable graph databases include Amazon Neptune (launched in 2017), Microsoft Azure Cosmos DB (added graph support in 2017), and TigerGraph (emerged in 2012).

The real explosion happened with the rise of social networks. Facebook, Google, and LinkedIn all built massive graph systems internally. Google's Knowledge Graph, launched in 2012, was a watershed moment. It fundamentally changed how search engines understand the world."

Speaking of knowledge graphs, can you explain the difference between a graph database and a knowledge graph?

"Great question. A graph database is the underlying technology for storing and querying graph-structured data—nodes, edges, properties, that kind of thing.

A knowledge graph is more of an application layer. It's a way of representing real-world entities and their relationships in a semantic, meaningful way, typically using ontologies and schemas.

So you could say a knowledge graph runs on top of a graph database, but it adds meaning and context to the data. The classic example is Google's Knowledge Graph, which connects entities like people, places, events, and concepts to answer questions like 'Who is the CEO of Tesla?'"`;

const RAW_TRANSCRIPT_3 = `alright everyone welcome back to the machine learning masterclass series today is session 7 and were covering transformers and attention mechanisms im Professor David Kim from Berkeley and this lecture was recorded on March 15 2024

so lets dive right in the transformer architecture was introduced in the landmark paper Attention Is All You Need by Vaswani et al at Google in 2017 this paper fundamentally changed natural language processing and later computer vision too

uh the key insight was that you dont actually need recurrent connections or convolutions to process sequences attention mechanisms alone are sufficient and actually more parallelizable

so what is attention at its core attention is a way for the model to focus on relevant parts of the input when producing each part of the output think of it like um when youre reading a sentence your eyes dont process every word equally you focus more on certain words depending on what youre trying to understand

the mathematical formulation is actually quite elegant we have queries keys and values Q K and V the attention scores are computed as softmax of Q times K transpose divided by the square root of the key dimension and then we multiply by V

uh self attention means the queries keys and values all come from the same sequence multi head attention means we run multiple attention operations in parallel with different learned projections and then concatenate the results

now the transformer architecture uses self attention in both the encoder and decoder stacks each layer has a multi head self attention sublayer followed by a feed forward neural network with residual connections and layer normalization

uh one crucial component is positional encoding since attention has no inherent notion of sequence order we need to inject position information the original paper used sinusoidal positional encodings but learned positional embeddings work well too

BERT Bidirectional Encoder Representations from Transformers came out from Google in 2018 and showed that pretraining a transformer encoder on masked language modeling produces excellent representations for downstream tasks

then GPT Generative Pre trained Transformer from OpenAI focused on the decoder side and showed that autoregressive language modeling at scale produces remarkably capable text generation

the scaling laws discovered around 2020 showed that performance improves predictably with model size dataset size and compute this led to models like GPT-3 with 175 billion parameters and eventually GPT-4`;

const CLEANED_TRANSCRIPT_3 = `Welcome back to the Machine Learning Masterclass series. Today is Session 7, and we're covering Transformers and Attention Mechanisms. I'm Professor David Kim from Berkeley, and this lecture was recorded on March 15, 2024.

Let's dive right in. The Transformer architecture was introduced in the landmark paper "Attention Is All You Need" by Vaswani et al. at Google in 2017. This paper fundamentally changed natural language processing, and later, computer vision too.

The key insight was that you don't actually need recurrent connections or convolutions to process sequences—attention mechanisms alone are sufficient, and actually more parallelizable.

**What is Attention?**

At its core, attention is a way for the model to focus on relevant parts of the input when producing each part of the output. Think of it like when you're reading a sentence: your eyes don't process every word equally—you focus more on certain words depending on what you're trying to understand.

The mathematical formulation is quite elegant. We have Queries, Keys, and Values (Q, K, V). The attention scores are computed as:

\`softmax(Q × K^T / √d_k) × V\`

**Self-Attention** means the queries, keys, and values all come from the same sequence. **Multi-Head Attention** means we run multiple attention operations in parallel with different learned projections, and then concatenate the results.

**Transformer Architecture**

The transformer architecture uses self-attention in both the encoder and decoder stacks. Each layer has:
1. A multi-head self-attention sublayer
2. A feed-forward neural network
3. Residual connections and layer normalization

One crucial component is **positional encoding**. Since attention has no inherent notion of sequence order, we need to inject position information. The original paper used sinusoidal positional encodings, but learned positional embeddings work well too.

**Key Models**

- **BERT** (Bidirectional Encoder Representations from Transformers) came out from Google in 2018 and showed that pretraining a transformer encoder on masked language modeling produces excellent representations for downstream tasks.

- **GPT** (Generative Pre-trained Transformer) from OpenAI focused on the decoder side and showed that autoregressive language modeling at scale produces remarkably capable text generation.

The scaling laws discovered around 2020 showed that performance improves predictably with model size, dataset size, and compute. This led to models like GPT-3 with 175 billion parameters, and eventually GPT-4.`;

// Mock document list
export const MOCK_DOCUMENTS: DocumentMeta[] = [
  {
    id: 'doc-001',
    collection: 'raw_videos',
    title: 'AI Ethics Panel Discussion - John Smith',
    created_at: '2024-01-15T10:30:00Z',
    word_count: 489,
    char_count: 2847,
    source: 'Conference Recording',
  },
  {
    id: 'doc-001',
    collection: 'cleaned_transcripts',
    title: 'AI Ethics Panel Discussion - John Smith (Cleaned)',
    created_at: '2024-01-16T14:20:00Z',
    word_count: 412,
    char_count: 2534,
    source: 'Conference Recording',
  },
  {
    id: 'doc-002',
    collection: 'raw_videos',
    title: 'Tech Deep Dive Ep. 42 - Graph Databases',
    created_at: '2024-02-20T09:00:00Z',
    word_count: 523,
    char_count: 3102,
    source: 'Podcast',
  },
  {
    id: 'doc-002',
    collection: 'cleaned_transcripts',
    title: 'Tech Deep Dive Ep. 42 - Graph Databases (Cleaned)',
    created_at: '2024-02-21T11:45:00Z',
    word_count: 478,
    char_count: 2891,
    source: 'Podcast',
  },
  {
    id: 'doc-003',
    collection: 'raw_videos',
    title: 'ML Masterclass Session 7 - Transformers',
    created_at: '2024-03-15T08:00:00Z',
    word_count: 498,
    char_count: 2956,
    source: 'Lecture Recording',
  },
  {
    id: 'doc-003',
    collection: 'cleaned_transcripts',
    title: 'ML Masterclass Session 7 - Transformers (Cleaned)',
    created_at: '2024-03-16T10:30:00Z',
    word_count: 456,
    char_count: 2743,
    source: 'Lecture Recording',
  },
];

// Mock document content
const MOCK_CONTENT: Record<string, Record<string, DocumentContent>> = {
  'doc-001': {
    raw_videos: {
      id: 'doc-001',
      collection: 'raw_videos',
      title: 'AI Ethics Panel Discussion - John Smith',
      content: RAW_TRANSCRIPT_1,
      metadata: {
        source: 'Conference Recording',
        created_at: '2024-01-15T10:30:00Z',
        word_count: 489,
        char_count: RAW_TRANSCRIPT_1.length,
      },
    },
    cleaned_transcripts: {
      id: 'doc-001',
      collection: 'cleaned_transcripts',
      title: 'AI Ethics Panel Discussion - John Smith (Cleaned)',
      content: CLEANED_TRANSCRIPT_1,
      metadata: {
        source: 'Conference Recording',
        created_at: '2024-01-16T14:20:00Z',
        word_count: 412,
        char_count: CLEANED_TRANSCRIPT_1.length,
      },
    },
  },
  'doc-002': {
    raw_videos: {
      id: 'doc-002',
      collection: 'raw_videos',
      title: 'Tech Deep Dive Ep. 42 - Graph Databases',
      content: RAW_TRANSCRIPT_2,
      metadata: {
        source: 'Podcast',
        created_at: '2024-02-20T09:00:00Z',
        word_count: 523,
        char_count: RAW_TRANSCRIPT_2.length,
      },
    },
    cleaned_transcripts: {
      id: 'doc-002',
      collection: 'cleaned_transcripts',
      title: 'Tech Deep Dive Ep. 42 - Graph Databases (Cleaned)',
      content: CLEANED_TRANSCRIPT_2,
      metadata: {
        source: 'Podcast',
        created_at: '2024-02-21T11:45:00Z',
        word_count: 478,
        char_count: CLEANED_TRANSCRIPT_2.length,
      },
    },
  },
  'doc-003': {
    raw_videos: {
      id: 'doc-003',
      collection: 'raw_videos',
      title: 'ML Masterclass Session 7 - Transformers',
      content: RAW_TRANSCRIPT_3,
      metadata: {
        source: 'Lecture Recording',
        created_at: '2024-03-15T08:00:00Z',
        word_count: 498,
        char_count: RAW_TRANSCRIPT_3.length,
      },
    },
    cleaned_transcripts: {
      id: 'doc-003',
      collection: 'cleaned_transcripts',
      title: 'ML Masterclass Session 7 - Transformers (Cleaned)',
      content: CLEANED_TRANSCRIPT_3,
      metadata: {
        source: 'Lecture Recording',
        created_at: '2024-03-16T10:30:00Z',
        word_count: 456,
        char_count: CLEANED_TRANSCRIPT_3.length,
      },
    },
  },
};

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock API functions
export async function fetchDocumentList(): Promise<DocumentMeta[]> {
  await delay(300);
  return MOCK_DOCUMENTS;
}

export async function fetchDocumentContent(
  docId: string,
  collection: 'raw_videos' | 'cleaned_transcripts'
): Promise<DocumentContent | null> {
  await delay(200);
  return MOCK_CONTENT[docId]?.[collection] ?? null;
}

export async function fetchDocumentPair(docId: string): Promise<{
  raw: DocumentContent | null;
  cleaned: DocumentContent | null;
}> {
  await delay(300);
  return {
    raw: MOCK_CONTENT[docId]?.raw_videos ?? null,
    cleaned: MOCK_CONTENT[docId]?.cleaned_transcripts ?? null,
  };
}

// Get unique document IDs (for grouping raw + cleaned)
export function getUniqueDocuments(): { id: string; title: string; source?: string }[] {
  const seen = new Set<string>();
  return MOCK_DOCUMENTS.filter((doc) => {
    if (seen.has(doc.id)) return false;
    seen.add(doc.id);
    return true;
  }).map((doc) => ({
    id: doc.id,
    title: doc.title.replace(' (Cleaned)', '').replace('_raw', ''),
    source: doc.source,
  }));
}

