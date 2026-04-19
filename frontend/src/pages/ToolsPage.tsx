import { useState, useRef } from 'react';
import { Globe, FileText, Loader2, Upload, X, Sparkles, Copy, Code } from 'lucide-react';
import { useAnalyzeSite, useAnalyzeFileTool } from '@/hooks/useTools';
import { AiProviderSelect } from '@/components/common';
import { DEFAULT_AI_PROVIDER, type AiProvider } from '@/utils/constants';
import toast from 'react-hot-toast';

type Tab = 'site' | 'file';

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('site');
  const [aiProvider, setAiProvider] = useState<AiProvider>(DEFAULT_AI_PROVIDER);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">도구</h1>
          <p className="text-sm text-content-tertiary">프로젝트 없이 독립적으로 사용할 수 있는 AI 도구</p>
        </div>
        <AiProviderSelect value={aiProvider} onChange={setAiProvider} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line">
        <button
          onClick={() => setActiveTab('site')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'site'
              ? 'border-accent text-accent'
              : 'border-transparent text-content-tertiary hover:text-content-primary'
          }`}
        >
          <Globe className="h-4 w-4" />
          사이트 분석
        </button>
        <button
          onClick={() => setActiveTab('file')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'file'
              ? 'border-accent text-accent'
              : 'border-transparent text-content-tertiary hover:text-content-primary'
          }`}
        >
          <FileText className="h-4 w-4" />
          파일 분석
        </button>
      </div>

      {activeTab === 'site' && <SiteAnalysisTool aiProvider={aiProvider} />}
      {activeTab === 'file' && <FileAnalysisTool aiProvider={aiProvider} />}
    </div>
  );
}

function SiteAnalysisTool({ aiProvider }: { aiProvider: AiProvider }) {
  const [url, setUrl] = useState('');
  const analyzeSite = useAnalyzeSite();
  const result = analyzeSite.data;

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    try {
      await analyzeSite.mutateAsync({ url: url.trim(), ai_provider: aiProvider });
    } catch {
      toast.error('사이트 분석에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="border border-line bg-surface-secondary p-6">
        <h2 className="mb-3 text-base font-semibold text-content-primary">URL 입력</h2>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder="https://example.com"
            className="flex-1 border border-line bg-surface-secondary px-4 py-2.5 text-sm text-content-primary placeholder-content-tertiary focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-line-focus/20"
          />
          <button
            onClick={handleAnalyze}
            disabled={analyzeSite.isPending || !url.trim()}
            className="inline-flex items-center gap-2 bg-accent px-6 py-2.5 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
          >
            {analyzeSite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            분석
          </button>
        </div>
      </div>

      {/* Loading */}
      {analyzeSite.isPending && (
        <div className="flex flex-col items-center justify-center border border-line bg-surface-hover py-12">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-accent" />
          <p className="text-sm text-content-tertiary">사이트를 크롤링하고 AI가 분석 중입니다...</p>
        </div>
      )}

      {/* Result */}
      {result && !analyzeSite.isPending && (
        <div className="space-y-4">
          {/* Crawl info */}
          <div className="border border-line bg-surface-secondary p-6">
            <h3 className="mb-3 text-base font-semibold text-content-primary">크롤링 결과</h3>
            <div className="space-y-2">
              {result.crawl.title && (
                <div>
                  <span className="text-xs font-medium text-content-muted">제목</span>
                  <p className="text-sm text-content-primary">{result.crawl.title}</p>
                </div>
              )}
              {result.crawl.meta_description && (
                <div>
                  <span className="text-xs font-medium text-content-muted">설명</span>
                  <p className="text-sm text-content-secondary">{result.crawl.meta_description}</p>
                </div>
              )}
              {result.crawl.headings.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-content-muted">주요 헤딩</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {result.crawl.headings.slice(0, 10).map((h, i) => (
                      <span key={i} className="bg-surface-hover px-2 py-0.5 text-xs text-content-secondary">
                        H{h.level}: {h.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Analysis */}
          <div className="border border-line bg-surface-secondary p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-content-primary">
                AI 분석 결과
                <span className="ml-2 text-xs font-normal text-content-muted">({result.ai_provider})</span>
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(analysisToText(result.analysis));
                    toast.success('텍스트로 복사했습니다.');
                  }}
                  className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs text-content-secondary hover:bg-surface-hover"
                >
                  <Copy className="h-3.5 w-3.5" />
                  텍스트 복사
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(analysisToMarkdown(result.analysis, result.url));
                    toast.success('마크다운으로 복사했습니다.');
                  }}
                  className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs text-content-secondary hover:bg-surface-hover"
                >
                  <Code className="h-3.5 w-3.5" />
                  마크다운 복사
                </button>
              </div>
            </div>
            <AnalysisContent data={result.analysis} />
          </div>
        </div>
      )}
    </div>
  );
}

function FileAnalysisTool({ aiProvider }: { aiProvider: AiProvider }) {
  const analyzeFile = useAnalyzeFileTool();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const result = analyzeFile.data;

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    try {
      await analyzeFile.mutateAsync({ file: selectedFile, ai_provider: aiProvider });
    } catch {
      toast.error('파일 분석에 실패했습니다.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div className="border border-line bg-surface-secondary p-6">
        <h2 className="mb-3 text-base font-semibold text-content-primary">파일 업로드</h2>

        {selectedFile ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between border border-line p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-content-tertiary" />
                <span className="text-sm font-medium text-content-primary">{selectedFile.name}</span>
                <span className="text-xs text-content-muted">{formatSize(selectedFile.size)}</span>
              </div>
              <button onClick={() => { setSelectedFile(null); analyzeFile.reset(); }} className="text-content-muted hover:text-danger">
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzeFile.isPending}
              className="inline-flex items-center gap-2 bg-accent px-6 py-2.5 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
            >
              {analyzeFile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              AI 분석
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center border-2 border-dashed py-12 cursor-pointer transition-colors ${
              isDragging ? 'border-accent bg-surface-hover' : 'border-line hover:border-line-hover'
            }`}
          >
            <Upload className="mb-3 h-8 w-8 text-content-tertiary" />
            <p className="text-sm text-content-secondary">파일을 드래그하거나 클릭하여 업로드</p>
            <p className="mt-1 text-xs text-content-tertiary">PDF, DOCX, TXT 지원</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md,.csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setSelectedFile(file);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {/* Loading */}
      {analyzeFile.isPending && (
        <div className="flex flex-col items-center justify-center border border-line bg-surface-hover py-12">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-accent" />
          <p className="text-sm text-content-tertiary">파일을 분석 중입니다...</p>
        </div>
      )}

      {/* Result */}
      {result && !analyzeFile.isPending && (
        <div className="space-y-4">
          {/* AI Analysis */}
          <div className="border border-line bg-surface-secondary p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-content-primary">
                AI 분석 결과
                <span className="ml-2 text-xs font-normal text-content-muted">({result.ai_provider})</span>
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(analysisToText(result.analysis));
                    toast.success('텍스트로 복사했습니다.');
                  }}
                  className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs text-content-secondary hover:bg-surface-hover"
                >
                  <Copy className="h-3.5 w-3.5" />
                  텍스트 복사
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(analysisToMarkdown(result.analysis, result.file_name));
                    toast.success('마크다운으로 복사했습니다.');
                  }}
                  className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs text-content-secondary hover:bg-surface-hover"
                >
                  <Code className="h-3.5 w-3.5" />
                  마크다운 복사
                </button>
              </div>
            </div>
            <AnalysisContent data={result.analysis} />
          </div>
        </div>
      )}
    </div>
  );
}

const LABEL_MAP: Record<string, string> = {
  summary: '요약',
  requirements: '요구사항',
  requirements_summary: '요구사항 요약',
  keywords: '키워드',
  target_audience: '타겟 사용자',
  constraints: '제약 조건',
  notes: '참고 사항',
  existing_site_analysis: '사이트 분석',
  combined_insights: '종합 인사이트',
  layout: '레이아웃',
  navigation: '네비게이션',
  color_scheme: '컬러 스킴',
  typography: '타이포그래피',
  strengths: '강점',
  weaknesses: '약점',
  recommended_direction: '추천 방향',
  key_patterns_to_adopt: '채택할 패턴',
  gaps_to_address: '해결할 격차',
  risk_areas: '위험 영역',
};

function AnalysisContent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <p className="mb-1 text-xs font-medium text-content-tertiary uppercase tracking-wide">
            {LABEL_MAP[key] || key.replace(/_/g, ' ')}
          </p>
          <RenderValue value={value} />
        </div>
      ))}
    </div>
  );
}

function RenderValue({ value }: { value: unknown }) {
  if (value == null) return <span className="text-sm text-content-muted">-</span>;

  if (typeof value === 'string') {
    return <p className="text-sm text-content-secondary whitespace-pre-wrap">{value}</p>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-sm text-content-muted">-</span>;
    return (
      <ul className="space-y-1">
        {value.map((item, i) => (
          <li key={i} className="text-sm text-content-secondary flex items-start gap-2">
            <span className="text-content-muted mt-0.5">-</span>
            <span>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    return (
      <div className="space-y-2 border-l-2 border-line pl-4 mt-1">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <p className="text-xs font-medium text-content-muted mb-0.5">{LABEL_MAP[k] || k.replace(/_/g, ' ')}</p>
            <RenderValue value={v} />
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm text-content-secondary">{String(value)}</p>;
}

function valueToText(value: unknown, indent = 0): string {
  const prefix = '  '.repeat(indent);
  if (value == null) return '';
  if (typeof value === 'string') return `${prefix}${value}`;
  if (Array.isArray(value)) return value.map((v) => `${prefix}- ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join('\n');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${prefix}${LABEL_MAP[k] || k}: ${typeof v === 'string' ? v : '\n' + valueToText(v, indent + 1)}`)
      .join('\n');
  }
  return `${prefix}${String(value)}`;
}

function analysisToText(data: Record<string, unknown>): string {
  return Object.entries(data)
    .map(([key, value]) => `[${LABEL_MAP[key] || key}]\n${valueToText(value)}`)
    .join('\n\n');
}

function analysisToMarkdown(data: Record<string, unknown>, fileName?: string): string {
  let md = fileName ? `# ${fileName} 분석 결과\n\n` : '# 분석 결과\n\n';
  for (const [key, value] of Object.entries(data)) {
    md += `## ${LABEL_MAP[key] || key}\n\n`;
    if (typeof value === 'string') {
      md += `${value}\n\n`;
    } else if (Array.isArray(value)) {
      md += value.map((v) => `- ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join('\n') + '\n\n';
    } else if (typeof value === 'object' && value !== null) {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        md += `### ${LABEL_MAP[k] || k}\n\n`;
        if (typeof v === 'string') md += `${v}\n\n`;
        else if (Array.isArray(v)) md += v.map((item) => `- ${String(item)}`).join('\n') + '\n\n';
        else md += `${JSON.stringify(v, null, 2)}\n\n`;
      }
    } else {
      md += `${String(value)}\n\n`;
    }
  }
  return md;
}
