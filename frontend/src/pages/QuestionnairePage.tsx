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
      className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#1e1e38]"
    >
      <div className="flex items-start gap-3">
        {!locked && (
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={1}
                placeholder="보조 설명 (선택)"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
              <textarea
                value={editPurpose}
                onChange={(e) => setEditPurpose(e.target.value)}
                rows={2}
                placeholder="이 질문의 의도 - 무엇을 확인하고자 하는지 (취합/브리프에 활용)"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  {Object.entries(QUESTION_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <select
                  value={editImportance}
                  onChange={(e) => setEditImportance(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  {Object.entries(IMPORTANCE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>중요도: {label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={editRequired}
                    onChange={(e) => setEditRequired(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 dark:border-gray-600"
                  />
                  필수
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={updateQuestion.isPending}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  저장
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between">
                <p
                  className={`text-sm font-medium text-gray-900 dark:text-white ${!locked ? 'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400' : ''}`}
                  onClick={() => !locked && setIsEditing(true)}
                >
                  {question.text}
                </p>
                <div className="ml-2 flex flex-shrink-0 items-center gap-1">
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-gray-400 hover:text-gray-600"
                    title="상세 보기"
                  >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {!locked && (
                    <button
                      onClick={() => onDelete(question.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {QUESTION_TYPE_LABELS[qType] || qType}
                </span>
                <span className={`rounded-md px-2 py-0.5 text-xs ${IMPORTANCE_COLORS[importance] || IMPORTANCE_COLORS[3]}`}>
                  {IMPORTANCE_LABELS[importance] || '보통'}
                </span>
                {qRequired && (
                  <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    필수
                  </span>
                )}
              </div>
              {expanded && (
                <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                  {question.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">설명:</span> {question.description}
                    </p>
                  )}
                  {question.purpose && (
                    <div className="flex items-start gap-1.5">
                      <Info className="mt-0.5 h-3 w-3 flex-shrink-0 text-indigo-500" />
                      <p className="text-xs text-indigo-600 dark:text-indigo-400">
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
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/projects/${projectId}`}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">질문지 관리</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{project?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConfirmed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              확정됨
            </span>
          )}
          {questionnaire?.ai_provider && (
            <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
              {AI_PROVIDER_LABELS[questionnaire.ai_provider as AiProvider] || questionnaire.ai_provider}
            </span>
          )}
          {!isConfirmed && (
            <>
              <AiProviderSelect value={aiProvider} onChange={setAiProvider} />
              <button
                onClick={handleGenerate}
                disabled={generateQuestionnaire.isPending || isProcessing}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 py-12 dark:border-indigo-800 dark:bg-indigo-900/10">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-indigo-600 dark:text-indigo-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">질문지 생성 중...</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">AI가 질문지를 생성하고 있습니다.</p>
        </div>
      )}

      {/* Failed State */}
      {isFailed && questionnaire && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/10">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-red-500" />
            <h3 className="mb-1 text-base font-semibold text-red-800 dark:text-red-300">질문지 생성에 실패했습니다</h3>
            {questionnaire.error_message && (
              <details className="mb-3 w-full max-w-lg text-left">
                <summary className="cursor-pointer text-xs text-red-500">상세 에러 보기</summary>
                <pre className="mt-1 max-h-24 overflow-auto rounded bg-red-100 p-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {questionnaire.error_message}
                </pre>
              </details>
            )}
            <button
              onClick={handleGenerate}
              disabled={generateQuestionnaire.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Confirmed Lock Banner */}
      {isConfirmed && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          <Lock className="h-4 w-4" />
          질문지가 확정되었습니다. 질문 수정, 추가, 삭제가 잠겨 있습니다.
        </div>
      )}

      {/* Manual Question Add */}
      {!isConfirmed && !showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-4 text-sm font-medium text-gray-500 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
        >
          <Plus className="h-4 w-4" />
          질문 직접 추가
        </button>
      ) : (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-800 dark:bg-indigo-900/10">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">새 질문 추가</h3>
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
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {Object.entries(QUESTION_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <select
                value={newQuestion.importance}
                onChange={(e) => setNewQuestion((q) => ({ ...q, importance: Number(e.target.value) }))}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {Object.entries(IMPORTANCE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>중요도: {label}</option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={newQuestion.is_required}
                  onChange={(e) => setNewQuestion((q) => ({ ...q, is_required: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 dark:border-gray-600"
                />
                필수
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddQuestion}
                disabled={createQuestion.isPending || !newQuestion.text.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {createQuestion.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                추가
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-gray-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          로딩 중...
        </div>
      ) : !isProcessing && filteredQuestions.length === 0 && !showAddForm ? (
        <div className="flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            질문이 없습니다. AI 생성 또는 직접 추가해주세요.
          </p>
        </div>
      ) : filteredQuestions.length > 0 ? (
        <>
          <p className="text-xs text-gray-400">총 {filteredQuestions.length}개 질문</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 dark:bg-[#1a1a2e]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">질문 삭제</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">이 질문을 삭제하시겠습니까?</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
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
