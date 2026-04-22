import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  Trash2,
  Play,
  Eye,
  ChevronRight,
  Plus,
  X,
  Upload,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useProject, useDeleteProject, useProjectActivities } from '@/hooks/useProjects';
import {
  useDepartments,
  useCreateDepartment,
  useDeleteDepartment,
  usePositions,
  useCreatePosition,
  useDeletePosition,
} from '@/hooks/useProjectStructure';
import { useProjectFiles, useUploadFile, useDeleteFile, useAnalyzeFile } from '@/hooks/useProjectFiles';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PROJECT_TYPE_LABELS, PROJECT_TYPE_COLORS, PROJECT_PHASES, DEFAULT_AI_PROVIDER } from '@/utils/constants';
import type { AiProvider } from '@/utils/constants';
import { formatDate } from '@/utils/formatters';
import type { ProjectStatus } from '@/types/project';
import AiProviderSelect from '@/components/common/AiProviderSelect';
import toast from 'react-hot-toast';
import { useState, useRef } from 'react';

const ACTION_LABELS: Record<string, string> = {
  project_created: '프로젝트를 생성했습니다',
  analysis_triggered: 'AI 분석을 시작했습니다',
  analysis_confirmed: '분석을 확인했습니다',
  analysis_section_regenerated: '분석 섹션을 재생성했습니다',
  questionnaire_generate_triggered: 'AI 질문지 생성을 시작했습니다',
  questionnaire_confirmed: '질문지를 확정했습니다',
  questionnaire_imported: '이전 질문지를 불러왔습니다',
  invitations_generated: '초대 링크를 생성했습니다',
  collection_closed: '응답 수집을 마감했습니다',
  aggregation_triggered: 'AI 취합을 시작했습니다',
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${d} ${h}:${min}`;
}

// Project status progression order
const STATUS_ORDER: ProjectStatus[] = [
  'created',
  'analyzing',
  'analysis_ready',
  'analysis_confirmed',
  'questionnaire_ready',
  'distributing',
  'collecting',
  'closed',
  'aggregating',
  'aggregation_ready',
  'brief_ready',
  'completed',
];

// Each phase maps to a range of project statuses
const PHASE_CONFIG: Record<string, {
  completedAfter: ProjectStatus[];  // phase is complete if project status is any of these or later
  activeAt: ProjectStatus[];        // phase is active if project status is any of these
  nextPhase?: string;
}> = {
  analysis: {
    completedAfter: ['analysis_confirmed', 'questionnaire_ready', 'distributing', 'collecting', 'closed', 'aggregating', 'aggregation_ready', 'brief_ready', 'completed'],
    activeAt: ['created', 'analyzing', 'analysis_ready'],
  },
  questionnaire: {
    completedAfter: ['distributing', 'collecting', 'closed', 'aggregating', 'aggregation_ready', 'brief_ready', 'completed'],
    activeAt: ['analysis_confirmed', 'questionnaire_ready'],
  },
  distribution: {
    completedAfter: ['closed', 'aggregating', 'aggregation_ready', 'brief_ready', 'completed'],
    activeAt: ['questionnaire_ready', 'distributing', 'collecting'],
  },
  collection: {
    completedAfter: ['closed', 'aggregating', 'aggregation_ready', 'brief_ready', 'completed'],
    activeAt: ['distributing', 'collecting'],
  },
  aggregation: {
    completedAfter: ['aggregation_ready', 'brief_ready', 'completed'],
    activeAt: ['closed', 'aggregating'],
  },
  brief: {
    completedAfter: ['completed'],
    activeAt: ['aggregation_ready', 'brief_ready'],
  },
};

function getPhaseState(
  projectStatus: ProjectStatus,
  phaseKey: string,
): 'completed' | 'active' | 'upcoming' {
  const cfg = PHASE_CONFIG[phaseKey];
  if (!cfg) return 'upcoming';

  if (cfg.completedAfter.includes(projectStatus)) return 'completed';
  if (cfg.activeAt.includes(projectStatus)) return 'active';
  return 'upcoming';
}

// Determine which phase should show "진행하기" (the next actionable phase)
function getNextActionablePhase(projectStatus: ProjectStatus): string | null {
  const phaseByStatus: Record<string, string> = {
    created: 'analysis',
    analyzing: 'analysis',
    analysis_ready: 'analysis',
    analysis_confirmed: 'questionnaire',
    questionnaire_ready: 'distribution',
    distributing: 'collection',
    collecting: 'collection',
    closed: 'aggregation',
    aggregating: 'aggregation',
    aggregation_ready: 'brief',
    brief_ready: 'brief',
    completed: '',
  };
  return phaseByStatus[projectStatus] || null;
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const id = projectId ? Number(projectId) : undefined;
  const { data: project, isLoading, error } = useProject(id);
  const deleteProject = useDeleteProject();
  const { data: activities = [] } = useProjectActivities(id);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Department / Position hooks
  const { data: departments = [] } = useDepartments(id);
  const createDepartment = useCreateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const { data: positions = [] } = usePositions(id);
  const createPosition = useCreatePosition();
  const deletePosition = useDeletePosition();

  // File hooks
  const { data: files = [] } = useProjectFiles(id);
  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();
  const analyzeFile = useAnalyzeFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiProvider, setAiProvider] = useState<AiProvider>(DEFAULT_AI_PROVIDER);
  const [isDragging, setIsDragging] = useState(false);

  const [newDeptName, setNewDeptName] = useState('');
  const [newPosName, setNewPosName] = useState('');
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [isAddingPos, setIsAddingPos] = useState(false);

  const handleAddDepartment = async () => {
    if (!id || !newDeptName.trim() || isAddingDept) return;
    setIsAddingDept(true);
    try {
      await createDepartment.mutateAsync({ projectId: id, data: { name: newDeptName.trim() } });
      setNewDeptName('');
    } catch {
      toast.error('부서 추가에 실패했습니다.');
    } finally {
      setIsAddingDept(false);
    }
  };

  const handleRemoveDepartment = async (deptId: number) => {
    if (!id) return;
    try {
      await deleteDepartment.mutateAsync({ projectId: id, deptId });
    } catch {
      toast.error('부서 삭제에 실패했습니다.');
    }
  };

  const handleAddPosition = async () => {
    if (!id || !newPosName.trim() || isAddingPos) return;
    setIsAddingPos(true);
    try {
      await createPosition.mutateAsync({
        projectId: id,
        data: { name: newPosName.trim(), weight: positions.length > 0 ? 1.0 : 2.0 },
      });
      setNewPosName('');
    } catch {
      toast.error('직급 추가에 실패했습니다.');
    } finally {
      setIsAddingPos(false);
    }
  };

  const handleRemovePosition = async (posId: number) => {
    if (!id) return;
    try {
      await deletePosition.mutateAsync({ projectId: id, posId });
    } catch {
      toast.error('직급 삭제에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteProject.mutateAsync(id);
      toast.success('프로젝트가 삭제되었습니다.');
      navigate('/projects');
    } catch {
      toast.error('프로젝트 삭제에 실패했습니다.');
    }
  };

  const ACCEPTED_FILE_TYPES = '.pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.gif,.bmp,.webp';

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!id || !fileList) return;
    for (const file of Array.from(fileList)) {
      try {
        await uploadFile.mutateAsync({ projectId: id, file });
        toast.success(`${file.name} 업로드 완료`);
      } catch {
        toast.error(`${file.name} 업로드에 실패했습니다.`);
      }
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!id) return;
    try {
      await deleteFile.mutateAsync({ projectId: id, fileId });
      toast.success('파일이 삭제되었습니다.');
    } catch {
      toast.error('파일 삭제에 실패했습니다.');
    }
  };

  const handleAnalyzeFile = async (fileId: number) => {
    if (!id) return;
    try {
      await analyzeFile.mutateAsync({ projectId: id, fileId, ai_provider: aiProvider });
      toast.success('AI 분석이 완료되었습니다.');
    } catch {
      toast.error('AI 분석에 실패했습니다.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-content-tertiary">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        로딩 중...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-content-tertiary">
        <p>프로젝트를 찾을 수 없습니다.</p>
        <Link to="/projects" className="mt-2 text-sm text-accent hover:text-accent">
          프로젝트 목록으로
        </Link>
      </div>
    );
  }

  const nextActionable = getNextActionablePhase(project.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/projects')}
          className="p-2 text-content-tertiary transition-colors hover:bg-surface-hover"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-content-primary">{project.title}</h1>
      </div>

      {/* Project Info Card */}
      <div className="border border-line bg-surface-secondary p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            {/* Status + Meta */}
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${PROJECT_TYPE_COLORS[project.project_type || 'uxui']}`}
              >
                {PROJECT_TYPE_LABELS[project.project_type || 'uxui']}
              </span>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  PROJECT_STATUS_COLORS[project.status]
                }`}
              >
                {PROJECT_STATUS_LABELS[project.status]}
              </span>
              <span className="text-sm text-content-secondary">{project.client_name}</span>
              {project.client_contact_email && (
                <span className="text-sm text-content-tertiary">{project.client_contact_email}</span>
              )}
              {project.client_contact_phone && (
                <span className="text-sm text-content-tertiary">{project.client_contact_phone}</span>
              )}
              <span className="text-xs text-content-muted">{formatDate(project.created_at)}</span>
            </div>

            {/* Existing site URL */}
            {project.existing_site_url && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-content-muted">기존 사이트</span>
                <a href={project.existing_site_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline break-all">
                  {project.existing_site_url}
                </a>
              </div>
            )}

            {/* Requirements text */}
            {project.requirements_text && (
              <div>
                <span className="text-xs font-medium text-content-muted">요구사항</span>
                <p className="mt-1 text-sm text-content-secondary whitespace-pre-wrap leading-relaxed">
                  {project.requirements_text}
                </p>
              </div>
            )}

            {/* Reference sites */}
            {project.reference_sites && project.reference_sites.length > 0 && (
              <div>
                <span className="text-xs font-medium text-content-muted">레퍼런스 사이트</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {project.reference_sites.map((site) => (
                    <a
                      key={site.id}
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 border border-line px-2.5 py-1 text-xs text-accent hover:bg-surface-hover"
                    >
                      {site.title || site.url}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="ml-4 flex-shrink-0 p-2 text-content-muted transition-colors hover:bg-danger-bg hover:text-danger"
            title="프로젝트 삭제"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 요구사항 파일 */}
      <div className="border border-line bg-surface-secondary p-6">
        <h2 className="mb-4 text-lg font-semibold text-content-primary">요구사항 파일</h2>

        {/* File list */}
        {files.length > 0 && (
          <div className="mb-4">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between border border-line p-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 flex-shrink-0 text-content-tertiary" />
                    <span className="text-sm font-medium text-content-primary truncate">{f.original_name}</span>
                    <span className="text-xs text-content-tertiary">{formatFileSize(f.file_size)}</span>
                    <span className="text-xs text-content-muted">{f.file_type}</span>
                  </div>

                  {f.ai_summary && (
                    <div className="mt-2 ml-6 border-l-2 border-accent pl-3">
                      <p className="text-xs font-medium text-accent">AI 요약</p>
                      <p className="text-xs text-content-secondary">{f.ai_summary}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  {f.extracted_text && !f.ai_summary && (
                    <div className="flex items-center gap-1">
                      <AiProviderSelect
                        value={aiProvider}
                        onChange={setAiProvider}
                        className="text-xs py-1 px-2"
                      />
                      <button
                        onClick={() => handleAnalyzeFile(f.id)}
                        disabled={analyzeFile.isPending}
                        className="inline-flex items-center gap-1 bg-accent px-3 py-1.5 text-xs font-medium text-accent-text disabled:opacity-50"
                      >
                        {analyzeFile.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        AI 분석
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => handleDeleteFile(f.id)}
                    disabled={deleteFile.isPending}
                    className="text-content-muted hover:text-danger"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-accent bg-surface-hover' : 'border-line hover:border-line-hover'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
          <Upload className="mx-auto h-8 w-8 text-content-tertiary" />
          <p className="mt-2 text-sm text-content-secondary">
            파일을 드래그하거나 클릭하여 업로드
          </p>
          <p className="mt-1 text-xs text-content-tertiary">
            PDF, DOCX, TXT, 이미지 파일 지원
          </p>
          {uploadFile.isPending && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-content-tertiary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              업로드 중...
            </div>
          )}
        </div>
      </div>

      {/* 팀/직급 구조 */}
      <div className="border border-line bg-surface-secondary p-6">
        <h2 className="mb-4 text-lg font-semibold text-content-primary">팀/직급 구조</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 부서 */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-content-secondary">부서</h3>
            <div className="mb-3 flex flex-wrap gap-2">
              {departments.map((dept) => (
                <span
                  key={dept.id}
                  className="inline-flex items-center gap-1.5 bg-surface-hover px-3 py-1.5 text-sm text-content-primary"
                >
                  {dept.name}
                  <button
                    onClick={() => handleRemoveDepartment(dept.id)}
                    className="text-content-muted hover:text-danger"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {departments.length === 0 && (
                <span className="text-xs text-content-tertiary">등록된 부서가 없습니다.</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDepartment(); } }}
                placeholder="부서명"
                className="border border-line bg-surface-input px-3 py-1.5 text-sm text-content-primary"
              />
              <button
                onClick={handleAddDepartment}
                disabled={!newDeptName.trim() || isAddingDept}
                className="inline-flex items-center gap-1 bg-accent px-3 py-1.5 text-xs font-medium text-accent-text disabled:opacity-50"
              >
                {isAddingDept ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                추가
              </button>
            </div>
          </div>

          {/* 직급 */}
          <div>
            <h3 className="mb-1 text-sm font-medium text-content-secondary">직급</h3>
            <p className="mb-3 text-xs text-content-muted">위에서부터 높은 직급순. 높은 직급의 응답이 취합 시 더 높은 가중치를 받습니다.</p>
            <div className="mb-3 space-y-1">
              {positions.map((pos, idx) => (
                <div
                  key={pos.id}
                  className="flex items-center justify-between border border-line bg-surface-hover px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-semibold text-content-muted">{idx + 1}</span>
                    <span className="text-sm text-content-primary">{pos.name}</span>
                  </div>
                  <button
                    onClick={() => handleRemovePosition(pos.id)}
                    className="text-content-muted hover:text-danger"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {positions.length === 0 && (
                <p className="py-4 text-center text-xs text-content-tertiary">등록된 직급이 없습니다.</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPosName}
                onChange={(e) => setNewPosName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPosition(); } }}
                placeholder="직급명 (예: 임원, 팀장, 실무자)"
                className="flex-1 border border-line bg-surface-input px-3 py-1.5 text-sm text-content-primary"
              />
              <button
                onClick={handleAddPosition}
                disabled={!newPosName.trim() || isAddingPos}
                className="inline-flex items-center gap-1 bg-accent px-3 py-1.5 text-xs font-medium text-accent-text disabled:opacity-50"
              >
                {isAddingPos ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                추가
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="border border-line bg-surface-secondary p-6">
        <h2 className="mb-6 text-lg font-semibold text-content-primary">프로젝트 진행 현황</h2>

        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-5 top-5 h-[calc(100%-2.5rem)] w-0.5 bg-line" />

          <div className="space-y-6">
            {PROJECT_PHASES.map((phase, index) => {
              const state = getPhaseState(project.status, phase.key);
              const isNextAction = phase.key === nextActionable;

              // Allow access to a phase if any previous phase is already active or completed
              const prevPhases = PROJECT_PHASES.slice(0, index);
              const isAccessible = state === 'upcoming' && prevPhases.some(
                (p) => getPhaseState(project.status, p.key) === 'active' || getPhaseState(project.status, p.key) === 'completed',
              );

              // Button style and label
              let btnLabel: string;
              let btnClass: string;
              let BtnIcon = ChevronRight;

              if (isNextAction) {
                btnLabel = '진행하기';
                btnClass = 'bg-accent text-accent-text hover:bg-accent-hover';
                BtnIcon = Play;
              } else if (state === 'completed') {
                btnLabel = '보기';
                btnClass = 'bg-surface-hover text-content-secondary hover:bg-surface-hover';
                BtnIcon = Eye;
              } else if (state === 'active') {
                btnLabel = '진행하기';
                btnClass = 'bg-accent text-accent-text hover:bg-accent-hover';
                BtnIcon = Play;
              } else {
                btnLabel = '대기';
                btnClass = 'bg-surface-primary text-content-tertiary cursor-default';
                BtnIcon = Circle;
              }

              return (
                <div key={phase.key} className="relative flex items-start gap-4">
                  {/* Icon */}
                  <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center">
                    {state === 'completed' ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-bg">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      </div>
                    ) : state === 'active' || isNextAction ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover ring-4">
                        <div className="h-3 w-3 rounded-full bg-accent" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover">
                        <Circle className="h-4 w-4 text-content-tertiary" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            state === 'active' || isNextAction
                              ? 'text-accent'
                              : state === 'completed'
                                ? 'text-content-primary'
                                : 'text-content-tertiary'
                          }`}
                        >
                          {index + 1}. {phase.label}
                        </p>
                        <p className="text-xs text-content-tertiary">
                          {state === 'completed'
                            ? '완료'
                            : state === 'active' || isNextAction
                              ? '진행 중'
                              : '대기'}
                        </p>
                      </div>
                      {state !== 'upcoming' || isNextAction ? (
                        <Link
                          to={`/projects/${project.id}/${phase.path}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${btnClass}`}
                        >
                          <BtnIcon className="h-3.5 w-3.5" />
                          {btnLabel}
                        </Link>
                      ) : isAccessible ? (
                        <Link
                          to={`/projects/${project.id}/${phase.path}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          보기
                        </Link>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${btnClass}`}>
                          {btnLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reference Sites */}
      {project.reference_sites && project.reference_sites.length > 0 && (
        <div className="border border-line bg-surface-secondary p-6">
          <h2 className="mb-4 text-lg font-semibold text-content-primary">레퍼런스 사이트</h2>
          <div className="space-y-2">
            {project.reference_sites.map((site) => (
              <div
                key={site.id}
                className="flex items-center justify-between border border-line p-3"
              >
                <div>
                  <p className="text-sm font-medium text-content-primary">{site.title}</p>
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    {site.url}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {/* Activity Timeline */}
      {activities.length > 0 && (
        <div className="border border-line bg-surface-secondary p-6">
          <h2 className="mb-4 text-lg font-semibold text-content-primary">최근 활동</h2>
          <div className="space-y-3">
            {activities.slice(0, 20).map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-medium text-accent">
                  {a.user_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-content-primary">
                    <span className="font-medium">{a.user_name || '알 수 없음'}</span>
                    <span className="text-content-secondary">{' '}{ACTION_LABELS[a.action] || a.action}</span>
                    {a.detail?.ai_provider && (
                      <span className="ml-1 text-xs text-content-muted">({a.detail.ai_provider as string})</span>
                    )}
                  </p>
                  <p className="text-xs text-content-muted">{formatRelativeTime(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.6)] p-4">
          <div className="w-full max-w-sm bg-surface-secondary p-6">
            <h3 className="text-lg font-semibold text-content-primary">프로젝트 삭제</h3>
            <p className="mt-2 text-sm text-content-tertiary">
              정말로 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="border border-line px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteProject.isPending}
                className="inline-flex items-center gap-2 bg-danger px-4 py-2 text-sm font-medium text-accent-text hover:opacity-85 disabled:opacity-50"
              >
                {deleteProject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
