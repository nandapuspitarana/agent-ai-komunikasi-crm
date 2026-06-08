import { Node, Edge } from '@xyflow/react';

export interface FlowContext {
  variables: Record<string, any>;
  currentStep: string | null;
  history: string[];
}

export class FlowInterpreter {
  private nodes: Node[];
  private edges: Edge[];
  private context: FlowContext;

  constructor(nodes: Node[], edges: Edge[], initialContext?: Partial<FlowContext>) {
    this.nodes = nodes;
    this.edges = edges;
    this.context = {
      variables: initialContext?.variables || {},
      currentStep: initialContext?.currentStep || null,
      history: initialContext?.history || [],
    };
  }

  public async execute(input: string): Promise<{ response: string; nextStep: string | null; context: FlowContext }> {
    // 1. Find the starting node (or current step)
    let currentNode = this.nodes.find(n => n.id === this.context.currentStep) || this.nodes.find(n => n.type === 'question' || n.type === 'input');
    
    if (!currentNode) {
      return { response: 'Flow tidak ditemukan atau tidak valid.', nextStep: null, context: this.context };
    }

    // 2. Process based on node type
    switch (currentNode.type) {
      case 'message':
        return this.processMessageNode(currentNode);
      case 'input':
        return this.processInputNode(currentNode, input);
      case 'condition':
        return this.processConditionNode(currentNode);
      case 'question':
        return this.processQuestionNode(currentNode, input);
      case 'answer':
        return this.processAnswerNode(currentNode);
      default:
        return { response: 'Tipe node tidak didukung.', nextStep: null, context: this.context };
    }
  }

  private processMessageNode(node: Node) {
    const message = node.data?.message || 'Pesan kosong';
    const nextNode = this.getNextNode(node.id);
    this.context.currentStep = nextNode?.id || null;
    
    return {
      response: message,
      nextStep: this.context.currentStep,
      context: this.context
    };
  }

  private processInputNode(node: Node, input: string) {
    const variableName = node.data?.variableName || 'user_input';
    this.context.variables[variableName] = input;
    this.context.history.push(`Input saved to ${variableName}: ${input}`);
    
    const nextNode = this.getNextNode(node.id);
    this.context.currentStep = nextNode?.id || null;

    return {
      response: `Data disimpan. Lanjut ke langkah berikutnya.`,
      nextStep: this.context.currentStep,
      context: this.context
    };
  }

  private processConditionNode(node: Node) {
    const condition = node.data?.condition || '';
    // Simple evaluation for demonstration (e.g., "var == 'value'")
    // In production, use a safe expression evaluator
    let isTrue = false;
    
    try {
      // Very basic mock evaluation
      if (condition.includes('==')) {
        const [left, right] = condition.split('==').map(s => s.trim().replace(/['"]/g, ''));
        const varValue = this.context.variables[left];
        isTrue = String(varValue).toLowerCase() === right.toLowerCase();
      }
    } catch (e) {
      console.error('Condition evaluation error:', e);
    }

    const nextNode = this.getNextNode(node.id, isTrue ? 'true' : 'false');
    this.context.currentStep = nextNode?.id || null;

    return {
      response: isTrue ? 'Kondisi terpenuhi.' : 'Kondisi tidak terpenuhi.',
      nextStep: this.context.currentStep,
      context: this.context
    };
  }

  private processQuestionNode(node: Node, input: string) {
    // In a real system, this would use NLP/LLM to match intent
    // For now, simple keyword matching
    const phrases = node.data?.phrases || [];
    const isMatch = phrases.some((phrase: string) => input.toLowerCase().includes(phrase.toLowerCase()));

    if (isMatch) {
      const nextNode = this.getNextNode(node.id);
      this.context.currentStep = nextNode?.id || null;
      return {
        response: 'Intent terdeteksi.',
        nextStep: this.context.currentStep,
        context: this.context
      };
    }

    return {
      response: 'Maaf, saya tidak mengerti. Bisa diulang?',
      nextStep: node.id, // Stay on same node
      context: this.context
    };
  }

  private processAnswerNode(node: Node) {
    const answerType = node.data?.answerType || 'text';
    let response = node.data?.label || 'Jawaban kosong';

    if (answerType === 'options') {
      const options = node.data?.options || [];
      response += '\n\nPilihan: ' + options.join(' | ');
    }

    const nextNode = this.getNextNode(node.id);
    this.context.currentStep = nextNode?.id || null;

    return {
      response,
      nextStep: this.context.currentStep,
      context: this.context
    };
  }

  private getNextNode(sourceId: string, sourceHandle?: string): Node | undefined {
    const edge = this.edges.find(e => 
      e.source === sourceId && (!sourceHandle || e.sourceHandle === sourceHandle)
    );
    
    if (edge) {
      return this.nodes.find(n => n.id === edge.target);
    }
    return undefined;
  }
}