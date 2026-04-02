import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Trash2,
  GripVertical,
  AlertCircle,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useProject } from '@/hooks/useProjects';
import {
  useQuestionnaire,
  useQuestionnaireStatus,
  useGenerateQuestionnaire,
  useConfirmQuestionnaire,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useReorderQuestions,
} from '@/hooks/useQuestionnaire';
import { AiProviderSelect } from '@/components/common';
import {
  QUESTION_TYPE_LABELS,
  IMPORTANCE_LABELS,
  IMPORTANCE_COLORS,
  DEFAULT_AI_PROVIDER,
  AI_PROVIDER_LABELS,
  type AiProvider,
} from '@/utils/constants';
import type { Question, QuestionType } from '@/types/questionnaire';
import toast from 'react-hot-toast';

function SortableQuestion({
  question,
  projectId,
  onDelete,
  locked = false,
}: {
  question: Question;
  projectId: number;
  onDelete: (id: number) => void;
  locked?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });
  const updateQuestion = useUpdateQuestion();
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editText, setEditText] = useState(question.text);
  const qType = question.question_type || question.type || 'textarea';
  const [editType, setEditType] = useState<string>(qType);
  const qRequired = question.is_required ?? question.isRequired ?? true;
  const [editRequired, setEditRequired] = useState(qRequired);
  const [editImportance, setEditImportance] = useState(question.importance ?? 3);
  const [editPurpose, setEditPurpose] = useState(question.purpose ?? '');
  const [editDescription, setEditDescription] = useState(question.description ?? '');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = async () => {
    try {
      await updateQuestion.mutateAsync({
        projectId,
        questionId: question.id,
        data: {
          text: editText,
          question_type: editType as QuestionType,
          is_required: editRequired,
          importance: editImportance,
          purpose: editPurpose,
          description: editDescription,
        },
      });
      setIsEditing(false);
      toast.success('질문이 수정되었습니다.');
    } catch {
      toast.error('질문 수정에 실패했습니다.');
    }
  };

  const importance = question.importance ?? 3;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-line bg-surface-secondary p-4"
    >
      <div className="flex items-start gap-3">
        {!locked && (
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab text-content-tertiary hover:text-content-primary"
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}

        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                placeholder="질문 내용"
                className="w-full border border-line bg-surface-secondary px-3 py-2 text-sm"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={1}
                placeholder="보조 설명 (선택)"
                className="w-full border border-line bg-surface-secondary px-3 py-2 text-xs"
              />
              <textarea
                value={editPurpose}
                onChange={(e) => setEditPurpose(e.target.value)}
                rows={2}
                placeholder="이 질문의 의도 - 무엇을 확인하고자 하는지 (취합/브리프에 활용)"
                className="w-full border border-line bg-surface-secondary px-3 py-2 text-xs"
              />
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="border border-line bg-surface-secondary px-3 py-1.5 text-xs"
                >
                  {Object.entries(QUESTION_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <select
                  value={editImportance}
                  onChange={(e) => setEditImportance(Number(e.target.value))}
                  className="border border-line bg-surface-secondary px-3 py-1.5 text-xs"
                >
                  {Object.entries(IMPORTANCE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>중요도: {label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-content-secondary">
                  <input
                    type="checkbox"
                    checked={editRequired}
                    onChange={(e) => setEditRequired(e.target.checked)}
                    className="border-line text-accent"
                  />
                  필수
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={updateQuestion.isPending}
                  className="bg-accent px-3 py-1.5 text-xs font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
                >
                  저장
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="border border-line px-3 py-1.5 text-xs text-content-secondary hover:bg-surface-hover"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between">
                <p
                  className={`text-sm font-medium text-content-primary ${!locked ? 'cursor-pointer hover:text-accent' : ''}`}
                  onClick={() => !locked && setIsEditing(true)}
                >
                  {question.text}
                </p>
                <div className="ml-2 flex flex-shrink-0 items-center gap-1">
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-content-tertiary hover:text-content-primary"
                    title="상세 보기"
                  >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {!locked && (
                    <button
                      onClick={() => onDelete(question.id)}
                      className="text-content-tertiary hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="bg-surface-hover px-2 py-0.5 text-xs text-content-secondary">
                  {QUESTION_TYPE_LABELS[qType] || qType}
                </span>
                <span className={`px-2 py-0.5 text-xs ${IMPORTANCE_COLORS[importance] || IMPORTANCE_COLORS[3]}`}>
                  {IMPORTANCE_LABELS[importance] || '보통'}
                </span>
                {qRequired && (
                  <span className="bg-danger-bg px-2 py-0.5 text-xs text-danger">
                    필수
                  </span>
                )}
              </div>
              {expanded && (
                <div className="mt-3 space-y-2 border-t border-line pt-3">
                  {question.description && (
                    <p className="text-xs text-content-tertiary">
                      <span className="font-medium">설명:</span> {question.description}
                    </p>
                  )}
                  {question.purpose && (
                    <div className="flex items-start gap-1.5">
                      <Info className="mt-0.5 h-3 w-3 flex-shrink-0 text-accent" />
                      <p className="text-xs text-accent">
                        <span className="font-medium">의도:</span> {question.purpose}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuestionnairePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId ? Number(projectId) : undefined;
  const { data: project } = useProject(id);
  const { data: questionnaire, isLoading, refetch: refetchQuestionnaire } = useQuestionnaire(id);
  const generateQuestionnaire = useGenerateQuestionnaire();
  const confirmQuestionnaire = useConfirmQuestionnaire();
  const createQuestion = useCreateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const reorderQuestions = useReorderQuestions();
  const [aiProvider, setAiProvider] = useState<AiProvider>(DEFAULT_AI_PROVIDER);
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: '', question_type: 'textarea' as string, importance: 3, purpose: '', description: '', is_required: true });

  // Polling
  const [isPolling, setIsPolling] = useState(false);
  const { data: statusData } = useQuestionnaireStatus(id, isPolling);

  useEffect(() => {
    if (questionnaire?.status === 'processing') setIsPolling(true);
  }, [questionnaire?.status]);

  useEffect(() => {
    if (statusData?.status === 'completed' || statusData?.status === 'failed') {
      setIsPolling(false);
      refetchQuestionnaire();
    }
  }, [statusData?.status, refetchQuestionnaire]);

  const isProcessing = questionnaire?.status === 'processing' || isPolling;
  const isFailed = questionnaire?.status === 'failed';
  const isConfirmed = questionnaire?.status === 'confirmed';

  const handleConfirm = async () => {
    if (!id) return;
    try {
      await confirmQuestionnaire.mutateAsync(id);
      toast.success('질문지가 확정되었습니다.');
    } catch {
      toast.error('확정에 실패했습니다.');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const questions = questionnaire?.questions ?? [];
  const categories = questionnaire?.categories ?? [];
  const filteredQuestions =
    categoryFilter === 'all'
      ? questions
      : questions.filter((q) => q.categoryId === categoryFilter);

  const handleGenerate = async () => {
    if (!id) return;
    try {
      await generateQuestionnaire.mutateAsync({ projectId: id, ai_provider: aiProvider });
      setIsPolling(true);
      toast.success(`${AI_PROVIDER_LABELS[aiProvider]}로 질문지 생성을 시작합니다.`);
    } catch {
      toast.error('질문지 생성에 실패했습니다.');
    }
  };

  const handleAddQuestion = async () => {
    if (!id || !newQuestion.text.trim()) return;
    try {
      await createQuestion.mutateAsync({
        projectId: id,
        data: {
          text: newQuestion.text,
          question_type: newQuestion.question_type as QuestionType,
          importance: newQuestion.importance,
          purpose: newQuestion.purpose,
          description: newQuestion.description,
          is_required: newQuestion.is_required,
        },
      });
      setNewQuestion({ text: '', question_type: 'textarea', importance: 3, purpose: '', description: '', is_required: true });
      setShowAddForm(false);
      toast.success('질문이 추가되었습니다.');
    } catch {
      toast.error('질문 추가에 실패했습니다.');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !id) return;

    const oldIndex = filteredQuestions.findIndex((q) => q.id === active.id);
    const newIndex = filteredQuestions.findIndex((q) => q.id === over.id);
    const reordered = arrayMove(filteredQuestions, oldIndex, newIndex);

    try {
      await reorderQuestions.mutateAsync({
        projectId: id,
        data: reordered.map((q, i) => ({ id: q.id, order: i })),
      });
    } catch {
      toast.error('순서 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (questionId: number) => {
    if (!id) return;
    try {
      await deleteQuestion.mutateAsync({ projectId: id, questionId });
      setConfirmDeleteId(null);
      toast.success('질문이 삭제되었습니다.');
    } catch {
      toast.error('질문 삭제에 실패했습니다.');
    }
  };

  const inputClass =
    'w-full border border-line bg-surface-secondary px-3 py-2 text-sm text-content-primary';

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
            <h1 className="text-2xl font-bold text-content-primary">질문지 관리</h1>
            <p className="text-sm text-content-tertiary">{project?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConfirmed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-medium text-success">
              <CheckCircle2 className="h-3 w-3" />
              확정됨
            </span>
          )}
          {questionnaire?.ai_provider && (
            <span className="inline-flex items-center rounded-full bg-surface-hover px-2.5 py-0.5 text-xs font-medium text-accent">
              {AI_PROVIDER_LABELS[questionnaire.ai_provider as AiProvider] || questionnaire.ai_provider}
            </span>
          )}
          {!isConfirmed && (
            <>
              <AiProviderSelect value={aiProvider} onChange={setAiProvider} />
              <button
                onClick={handleGenerate}
                disabled={generateQuestionnaire.isPending || isProcessing}
                className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
              >
                {generateQuestionnaire.isPending || isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {questions.length > 0 ? 'AI 추가 생성' : 'AI 질문지 생성'}
              </button>
              {questions.length > 0 && (
                <button
                  onClick={handleConfirm}
                  disabled={confirmQuestionnaire.isPending}
                  className="inline-flex items-center gap-2 bg-success px-4 py-2 text-sm font-medium text-accent-text hover:opacity-85 disabled:opacity-50"
                >
                  {confirmQuestionnaire.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  질문지 확정
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Processing State */}
      {isProcessing && (
        <div className="flex flex-col items-center justify-center border border-line bg-surface-hover py-12">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-accent" />
          <h3 className="mb-2 text-lg font-semibold text-content-primary">질문지 생성 중...</h3>
          <p className="text-sm text-content-tertiary">AI가 질문지를 생성하고 있습니다.</p>
        </div>
      )}

      {/* Failed State */}
      {isFailed && questionnaire && (
        <div className="border border-danger bg-danger-bg p-6">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-danger" />
            <h3 className="mb-1 text-base font-semibold text-danger">질문지 생성에 실패했습니다</h3>
            {questionnaire.error_message && (
              <details className="mb-3 w-full max-w-lg text-left">
                <summary className="cursor-pointer text-xs text-danger">상세 에러 보기</summary>
                <pre className="mt-1 max-h-24 overflow-auto bg-danger-bg p-2 text-xs text-danger">
                  {questionnaire.error_message}
                </pre>
              </details>
            )}
            <button
              onClick={handleGenerate}
              disabled={generateQuestionnaire.isPending}
              className="inline-flex items-center gap-2 bg-danger px-4 py-2 text-sm font-medium text-accent-text hover:opacity-85 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-accent text-accent-text'
                : 'bg-surface-hover text-content-secondary hover:bg-surface-hover'
            }`}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-accent text-accent-text'
                  : 'bg-surface-hover text-content-secondary hover:bg-surface-hover'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Confirmed Lock Banner */}
      {isConfirmed && (
        <div className="flex items-center gap-2 border border-success bg-success-bg px-4 py-3 text-sm text-success">
          <Lock className="h-4 w-4" />
          질문지가 확정되었습니다. 질문 수정, 추가, 삭제가 잠겨 있습니다.
        </div>
      )}

      {/* Manual Question Add */}
      {!isConfirmed && !showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center justify-center gap-2 border-2 border-dashed border-line py-4 text-sm font-medium text-content-tertiary transition-colors hover:border-line-hover hover:text-accent"
        >
          <Plus className="h-4 w-4" />
          질문 직접 추가
        </button>
      ) : (
        <div className="border border-line bg-surface-hover p-5">
          <h3 className="mb-3 text-sm font-semibold text-content-primary">새 질문 추가</h3>
          <div className="space-y-3">
            <textarea
              value={newQuestion.text}
              onChange={(e) => setNewQuestion((q) => ({ ...q, text: e.target.value }))}
              rows={2}
              placeholder="질문 내용 *"
              className={inputClass}
            />
            <input
              value={newQuestion.description}
              onChange={(e) => setNewQuestion((q) => ({ ...q, description: e.target.value }))}
              placeholder="보조 설명 (선택)"
              className={inputClass}
            />
            <textarea
              value={newQuestion.purpose}
              onChange={(e) => setNewQuestion((q) => ({ ...q, purpose: e.target.value }))}
              rows={2}
              placeholder="이 질문의 의도 - 무엇을 확인하고자 하는지 (취합/브리프에 활용)"
              className={inputClass}
            />
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={newQuestion.question_type}
                onChange={(e) => setNewQuestion((q) => ({ ...q, question_type: e.target.value }))}
                className="border border-line bg-surface-secondary px-3 py-1.5 text-xs"
              >
                {Object.entries(QUESTION_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <select
                value={newQuestion.importance}
                onChange={(e) => setNewQuestion((q) => ({ ...q, importance: Number(e.target.value) }))}
                className="border border-line bg-surface-secondary px-3 py-1.5 text-xs"
              >
                {Object.entries(IMPORTANCE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>중요도: {label}</option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-content-secondary">
                <input
                  type="checkbox"
                  checked={newQuestion.is_required}
                  onChange={(e) => setNewQuestion((q) => ({ ...q, is_required: e.target.checked }))}
                  className="border-line text-accent"
                />
                필수
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddQuestion}
                disabled={createQuestion.isPending || !newQuestion.text.trim()}
                className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-xs font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
              >
                {createQuestion.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                추가
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="border border-line px-4 py-2 text-xs text-content-secondary hover:bg-surface-hover"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-content-tertiary">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          로딩 중...
        </div>
      ) : !isProcessing && filteredQuestions.length === 0 && !showAddForm ? (
        <div className="flex h-32 flex-col items-center justify-center border-2 border-dashed border-line">
          <p className="text-sm text-content-tertiary">
            질문이 없습니다. AI 생성 또는 직접 추가해주세요.
          </p>
        </div>
      ) : filteredQuestions.length > 0 ? (
        <>
          <p className="text-xs text-content-tertiary">총 {filteredQuestions.length}개 질문</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={filteredQuestions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {filteredQuestions.map((question) => (
                  <SortableQuestion
                    key={question.id}
                    question={question}
                    projectId={id!}
                    onDelete={(qId) => setConfirmDeleteId(qId)}
                    locked={isConfirmed}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      ) : null}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.6)] p-4">
          <div className="w-full max-w-sm bg-surface-secondary p-6">
            <h3 className="text-lg font-semibold text-content-primary">질문 삭제</h3>
            <p className="mt-2 text-sm text-content-tertiary">이 질문을 삭제하시겠습니까?</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="border border-line px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="bg-danger px-4 py-2 text-sm font-medium text-accent-text hover:opacity-85"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
