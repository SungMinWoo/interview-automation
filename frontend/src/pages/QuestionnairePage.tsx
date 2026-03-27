import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Trash2,
  GripVertical,
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
  useGenerateQuestionnaire,
  useUpdateQuestion,
  useDeleteQuestion,
  useReorderQuestions,
} from '@/hooks/useQuestionnaire';
import { QUESTION_TYPE_LABELS } from '@/utils/constants';
import type { Question, QuestionType } from '@/types/questionnaire';
import toast from 'react-hot-toast';

function SortableQuestion({
  question,
  projectId,
  onDelete,
}: {
  question: Question;
  projectId: number;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });
  const updateQuestion = useUpdateQuestion();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(question.text);
  const [editType, setEditType] = useState<QuestionType>(question.type);
  const [editRequired, setEditRequired] = useState(question.isRequired);

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
        data: { text: editText, type: editType, isRequired: editRequired },
      });
      setIsEditing(false);
      toast.success('질문이 수정되었습니다.');
    } catch {
      toast.error('질문 수정에 실패했습니다.');
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#1e1e38]"
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as QuestionType)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  {Object.entries(QUESTION_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
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
                  onClick={() => {
                    setEditText(question.text);
                    setEditType(question.type);
                    setEditRequired(question.isRequired);
                    setIsEditing(false);
                  }}
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
                  className="cursor-pointer text-sm font-medium text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                  onClick={() => setIsEditing(true)}
                >
                  {question.text}
                </p>
                <button
                  onClick={() => onDelete(question.id)}
                  className="ml-2 flex-shrink-0 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {QUESTION_TYPE_LABELS[question.type]}
                </span>
                {question.isRequired && (
                  <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    필수
                  </span>
                )}
                {question.options.length > 0 && (
                  <span className="text-xs text-gray-400">
                    선택지 {question.options.length}개
                  </span>
                )}
              </div>
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
  const { data: questionnaire, isLoading } = useQuestionnaire(id);
  const generateQuestionnaire = useGenerateQuestionnaire();
  const deleteQuestion = useDeleteQuestion();
  const reorderQuestions = useReorderQuestions();
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

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
      await generateQuestionnaire.mutateAsync(id);
      toast.success('질문지가 생성되었습니다.');
    } catch {
      toast.error('질문지 생성에 실패했습니다.');
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
        data: { questionIds: reordered.map((q) => q.id) },
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
        <button
          onClick={handleGenerate}
          disabled={generateQuestionnaire.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {generateQuestionnaire.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          AI 질문지 생성
        </button>
      </div>

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

      {/* Questions List */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-gray-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          로딩 중...
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            질문이 없습니다. AI 질문지 생성을 시작해주세요.
          </p>
        </div>
      ) : (
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
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 dark:bg-[#1a1a2e]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">질문 삭제</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              이 질문을 삭제하시겠습니까?
            </p>
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
