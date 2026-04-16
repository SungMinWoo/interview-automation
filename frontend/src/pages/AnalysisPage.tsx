import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, Loader2, CheckCircle2, AlertCircle, Pencil, Check, RefreshCw, XCircle, Sparkles } from 'lucide-react';
import {
  useAnalysis,
  useAnalysisStatus,
  useTriggerAnalysis,
  useUpdateAnalysis,
  useConfirmAnalysis,
  useRegenerateSection,
} from '@/hooks/useAnalysis';
import { useProject } from '@/hooks/useProjects';
import { AiProviderSelect } from '@/components/common';
import { DEFAULT_AI_PROVIDER, AI_PROVIDER_LABELS, type AiProvider } from '@/utils/constants';
import toast from 'react-hot-toast';

const STATUS_LABELS: Record<string, string> = {
  pending: '대기 중',
  processing: '분석 중',
  completed: '완료',
  confirmed: '확인됨',
  failed: '실패',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-surface-hover text-content-secondary',
  processing: 'bg-surface-hover text-content-primary',
  completed: 'bg-success-bg text-success',
  confirmed: 'bg-success-bg text-success',
  failed: 'bg-danger-bg text-danger',
};

const SECTION_TITLES: Record<string, string> = {
  requirements_summary: '요구사항 요약',
  existing_site_analysis: '기존 사이트 분석',
  reference_sites_analysis: '레퍼런스 사이트 분석',
  combined_insights: '종합 인사이트',
};

export default function AnalysisPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId ? Number(projectId) : undefined;
  const { data: project } = useProject(id);
  const { data: analysis, refetch: refetchAnalysis } = useAnalysis(id);
  const shouldPoll = analysis?.status === 'processing';
  const { data: statusData } = useAnalysisStatus(id, shouldPoll);
  const triggerAnalysis = useTriggerAnalysis();
  const updateAnalysis = useUpdateAnalysis();
  const confirmAnalysis = useConfirmAnalysis();
  const regenerateSection = useRegenerateSection();
  const [aiProvider, setAiProvider] = useState<AiProvider>(DEFAULT_AI_PROVIDER);

  useEffect(() => {
    if (statusData && statusData.status !== 'processing') {
      refetchAnalysis();
    }
  }, [statusData?.status, refetchAnalysis]);

  const handleTrigger = async () => {
    if (!id) return;
    try {
      await triggerAnalysis.mutateAsync({ projectId: id, ai_provider: aiProvider });
      refetchAnalysis();
      toast.success(`${AI_PROVIDER_LABELS[aiProvider]}로 AI 분석을 시작합니다.`);
    } catch {
      toast.error('분석 시작에 실패했습니다.');
    }
  };

  const handleConfirm = async () => {
    if (!id) return;
    try {
      await confirmAnalysis.mutateAsync(id);
      toast.success('분석이 확인되었습니다.');
    } catch {
      toast.error('확인에 실패했습니다.');
    }
  };

  const handleRegenerateSection = async (section: string) => {
    if (!id) return;
    try {
      await regenerateSection.mutateAsync({ projectId: id, section, ai_provider: aiProvider });
      toast.success(`${SECTION_TITLES[section]} 재생성 완료`);
    } catch {
      toast.error('재생성에 실패했습니다.');
    }
  };

  const isProcessing = analysis?.status === 'processing';
  const isCompleted = analysis?.status === 'completed';
  const isConfirmed = analysis?.status === 'confirmed';
  const isFailed = analysis?.status === 'failed';
  const hasResults = isCompleted || isConfirmed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/projects/${projectId}`}
            className="p-2 text-content-tertiary transition-colors hover:bg-surface-hover"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-content-primary">AI 분석</h1>
            <p className="text-sm text-content-tertiary">{project?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {analysis?.ai_provider && (
            <span className="inline-flex items-center rounded-full bg-surface-hover px-2.5 py-0.5 text-xs font-medium text-accent">
              {AI_PROVIDER_LABELS[analysis.ai_provider as AiProvider] || analysis.ai_provider}
            </span>
          )}
          {analysis && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[analysis.status] || STATUS_COLORS.pending}`}
            >
              {analysis.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin" />}
              {(isCompleted || isConfirmed) && <CheckCircle2 className="h-3 w-3" />}
              {isFailed && <XCircle className="h-3 w-3" />}
              {STATUS_LABELS[analysis.status] || analysis.status}
            </span>
          )}
        </div>
      </div>

      {/* Failed State */}
      {isFailed && analysis && (
        <div className="border border-danger bg-danger-bg p-6">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-danger" />
            <h3 className="mb-2 text-lg font-semibold text-danger">분석에 실패했습니다</h3>
            {analysis.error_message && (
              <details className="mb-4 w-full max-w-lg text-left">
                <summary className="cursor-pointer text-xs text-danger">상세 에러 보기</summary>
                <pre className="mt-2 max-h-32 overflow-auto bg-danger-bg p-3 text-xs text-danger">
                  {analysis.error_message}
                </pre>
              </details>
            )}
            <div className="flex items-center gap-3">
              <AiProviderSelect value={aiProvider} onChange={setAiProvider} />
              <button
                onClick={handleTrigger}
                disabled={triggerAnalysis.isPending}
                className="inline-flex items-center gap-2 bg-danger px-6 py-2.5 text-sm font-medium text-accent-text hover:opacity-85 disabled:opacity-50"
              >
                {triggerAnalysis.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                다시 시도
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Button */}
      {(!analysis || analysis.status === 'pending') && !isProcessing && (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-line py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center bg-surface-hover">
            <Play className="h-8 w-8 text-accent" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-content-primary">AI 분석 시작</h3>
          <p className="mb-6 max-w-md text-center text-sm text-content-tertiary">
            프로젝트 정보, 요구사항 파일, 레퍼런스 사이트를 기반으로 AI가 종합 분석을 수행합니다.
          </p>
          <div className="flex items-center gap-3">
            <AiProviderSelect value={aiProvider} onChange={setAiProvider} />
            <button
              onClick={handleTrigger}
              disabled={triggerAnalysis.isPending}
              className="inline-flex items-center gap-2 bg-accent px-6 py-2.5 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
            >
              {triggerAnalysis.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              AI 분석 시작
            </button>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && !isFailed && (
        <div className="flex flex-col items-center justify-center border border-line bg-surface-hover py-16">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-accent" />
          <h3 className="mb-2 text-lg font-semibold text-content-primary">분석 진행 중...</h3>
          <p className="text-sm text-content-tertiary">AI가 프로젝트를 분석하고 있습니다. 잠시만 기다려주세요.</p>
        </div>
      )}

      {/* Results */}
      {hasResults && analysis && (
        <div className="space-y-4">
          {/* Global actions */}
          <div className="flex justify-end gap-3">
            <AiProviderSelect value={aiProvider} onChange={setAiProvider} />
            {!isConfirmed && (
              <>
                <button
                  onClick={handleTrigger}
                  disabled={triggerAnalysis.isPending}
                  className="inline-flex items-center gap-2 border border-line px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover"
                >
                  <RefreshCw className="h-4 w-4" />
                  전체 재분석
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={confirmAnalysis.isPending}
                  className="inline-flex items-center gap-2 bg-success px-4 py-2 text-sm font-medium text-accent-text hover:opacity-85 disabled:opacity-50"
                >
                  {confirmAnalysis.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Check className="h-4 w-4" />
                  분석 확인
                </button>
              </>
            )}
          </div>

          {/* Requirements Summary */}
          <EditableSection
            title="요구사항 요약"
            sectionKey="requirements_summary"
            projectId={id!}
            locked={!!isConfirmed}
            aiProvider={aiProvider}
            onRegenerate={handleRegenerateSection}
            isRegenerating={regenerateSection.isPending}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-content-secondary">
              {analysis.requirements_summary || '아직 데이터가 없습니다.'}
            </p>
          </EditableSection>

          {/* Existing Site Analysis */}
          {analysis.existing_site_analysis && Object.keys(analysis.existing_site_analysis).length > 0 && (
            <EditableSection
              title="기존 사이트 분석"
              sectionKey="existing_site_analysis"
              projectId={id!}
              locked={!!isConfirmed}
              aiProvider={aiProvider}
              onRegenerate={handleRegenerateSection}
              isRegenerating={regenerateSection.isPending}
            >
              <JsonContent data={analysis.existing_site_analysis} />
            </EditableSection>
          )}

          {/* Reference Sites Analysis */}
          {analysis.reference_sites_analysis && (
            <EditableSection
              title="레퍼런스 사이트 분석"
              sectionKey="reference_sites_analysis"
              projectId={id!}
              locked={!!isConfirmed}
              aiProvider={aiProvider}
              onRegenerate={handleRegenerateSection}
              isRegenerating={regenerateSection.isPending}
            >
              {Array.isArray(analysis.reference_sites_analysis) ? (
                <div className="space-y-4">
                  {analysis.reference_sites_analysis.map((site: any, i: number) => (
                    <div key={i} className="border border-line p-4">
                      <h4 className="mb-2 text-sm font-semibold text-content-primary">
                        {site.url ? `${i + 1}. ${site.url}` : `레퍼런스 ${i + 1}`}
                      </h4>
                      <JsonContent data={site} />
                    </div>
                  ))}
                </div>
              ) : Object.keys(analysis.reference_sites_analysis).length > 0 ? (
                <JsonContent data={analysis.reference_sites_analysis} />
              ) : null}
            </EditableSection>
          )}

          {/* Combined Insights */}
          {analysis.combined_insights && Object.keys(analysis.combined_insights).length > 0 && (
            <EditableSection
              title="종합 인사이트"
              sectionKey="combined_insights"
              projectId={id!}
              locked={!!isConfirmed}
              aiProvider={aiProvider}
              onRegenerate={handleRegenerateSection}
              isRegenerating={regenerateSection.isPending}
            >
              <JsonContent data={analysis.combined_insights} />
            </EditableSection>
          )}

          {/* Confirmed badge */}
          {analysis.confirmed_at && (
            <div className="flex items-center gap-2 bg-success-bg p-3 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              분석이 확인되었습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditableSection({
  title,
  sectionKey,
  projectId,
  locked,
  aiProvider,
  onRegenerate,
  isRegenerating,
  children,
}: {
  title: string;
  sectionKey: string;
  projectId: number;
  locked: boolean;
  aiProvider: AiProvider;
  onRegenerate: (section: string) => void;
  isRegenerating: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-line bg-surface-secondary p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-content-primary">{title}</h3>
        {!locked && (
          <button
            onClick={() => onRegenerate(sectionKey)}
            disabled={isRegenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent hover:bg-surface-hover disabled:opacity-50"
          >
            {isRegenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI 재생성
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

const LABEL_MAP: Record<string, string> = {
  url: 'URL', layout: '레이아웃', navigation: '네비게이션',
  color_scheme: '컬러 스킴', typography: '타이포그래피',
  strengths: '강점', weaknesses: '약점',
  standout_features: '주요 특징', design_patterns: '디자인 패턴',
  relevant_to_requirements: '요구사항 관련성',
  recommended_direction: '추천 디자인 방향',
  key_patterns_to_adopt: '채택할 패턴', gaps_to_address: '해결할 격차',
  risk_areas: '위험 영역',
};

function renderValue(value: unknown): JSX.Element | null {
  if (value == null) return <span className="text-sm text-content-muted">-</span>;

  if (typeof value === 'string') {
    if (value.startsWith('http')) {
      return <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline break-all">{value}</a>;
    }
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
            {renderValue(v)}
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm text-content-secondary">{String(value)}</p>;
}

function JsonContent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <p className="mb-1 text-xs font-medium text-content-tertiary uppercase tracking-wide">
            {LABEL_MAP[key] || key.replace(/_/g, ' ')}
          </p>
          {renderValue(value)}
        </div>
      ))}
    </div>
  );
}
