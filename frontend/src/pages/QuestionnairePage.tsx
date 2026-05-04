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
  X,
  Copy,
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
import { useMyRole } from '@/hooks/useMembers';
import { useDepartments, usePositions } from '@/hooks/useProjectStructure';
import {
  useQuestionnaire,
  useQuestionnaireStatus,
  useGenerateQuestionnaire,
  useConfirmQuestionnaire,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useReorderQuestions,
  useCreateSection,
  useDeleteSection,
  useGenerateSectionQuestions,
  useQuestionnaireTemplates,
  useImportQuestionnaire,
} from '@/hooks/useQuestionnaire';
import { AiProviderSelect } from '@/components/common';
import {
  QUESTION_TYPE_LABELS,
  IMPORTANCE_LABELS,
  IMPORTANCE_COLORS,
  IMPORTANCE_OPTIONS,
  SECTION_IMPORTANCE_LABELS,
  SECTION_IMPORTANCE_COLORS,
  SECTION_IMPORTANCE_OPTIONS,
  DEFAULT_AI_PROVIDER,
  AI_PROVIDER_LABELS,
  type AiProvider,
} from '@/utils/constants';
import type { Question, QuestionType, QuestionSection } from '@/types/questionnaire';
import toast from 'react-hot-toast';

function getOptionTexts(options: Question['options']): string[] {
  if (!options || options.length === 0) return [];
  if (typeof options[0] === 'string') return options as string[];
  return (options as { text: string }[]).map((o) => o.text);
}

const isChoiceType = (t: string) => t === 'single_choice' || t === 'multiple_choice';

function SortableQuestion({
  question,
  projectId,
  onDelete,
  locked = false,
  departments = [],
  positions = [],
}: {
  question: Question;
  projectId: number;
  onDelete: (id: number) => void;
  locked?: boolean;
  departments?: { id: number; name: string }[];
  positions?: { id: number; name: string }[];
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
  const [editImportance, setEditImportance] = useState(question.importance || 'important');
  const [editPurpose, setEditPurpose] = useState(question.purpose ?? '');
  const [editDescription, setEditDescription] = useState(question.description ?? '');
  const [editOptions, setEditOptions] = useState<string[]>(getOptionTexts(question.options));
  const [newOptionText, setNewOptionText] = useState('');
  const [editTargetDepts, setEditTargetDepts] = useState<number[]>(question.target_departments ?? []);
  const [editTargetPositions, setEditTargetPositions] = useState<number[]>(question.target_positions ?? []);

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
          importance: editImportance,
          purpose: editPurpose,
          description: editDescription,
          options: isChoiceType(editType) ? editOptions : [],
          target_departments: editTargetDepts,
          target_positions: editTargetPositions,
        },
      });
      setIsEditing(false);
      toast.success('질문이 수정되었습니다.');
    } catch {
      toast.error('질문 수정에 실패했습니다.');
    }
  };

  const addOption = () => {
    if (!newOptionText.trim()) return;
    setEditOptions((prev) => [...prev, newOptionText.trim()]);
    setNewOptionText('');
  };

  const removeOption = (idx: number) => {
    setEditOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleDept = (deptId: number) => {
    setEditTargetDepts((prev) => prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]);
  };

  const togglePosition = (posId: number) => {
    setEditTargetPositions((prev) => prev.includes(posId) ? prev.filter((id) => id !== posId) : [...prev, posId]);
  };

  const importance = question.importance || 'important';
  const optionTexts = getOptionTexts(question.options);

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
                className="w-full border border-line bg-surface-secondary px-3 py-2 text-sm text-content-primary"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={1}
                placeholder="보조 설명 (선택)"
                className="w-full border border-line bg-surface-secondary px-3 py-2 text-xs text-content-primary"
              />
              <textarea
                value={editPurpose}
                onChange={(e) => setEditPurpose(e.target.value)}
                rows={2}
                placeholder="이 질문의 의도 - 무엇을 확인하고자 하는지 (취합/브리프에 활용)"
                className="w-full border border-line bg-surface-secondary px-3 py-2 text-xs text-content-primary"
              />
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="border border-line bg-surface-secondary px-3 py-1.5 text-xs text-content-primary"
                >
                  {Object.entries(QUESTION_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <select
                  value={editImportance}
                  onChange={(e) => setEditImportance(e.target.value)}
                  className="border border-line bg-surface-secondary px-3 py-1.5 text-xs text-content-primary"
                >
                  {IMPORTANCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>중요도: {opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 선택지 편집 (단일선택/복수선택일 때) */}
              {isChoiceType(editType) && (
                <div className="border border-line p-3 space-y-2">
                  <p className="text-xs font-medium text-content-secondary">
                    선택지 {editType === 'single_choice' ? '(단일선택)' : '(복수선택)'}
                  </p>
                  {editOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs text-content-muted">{idx + 1}</span>
                      <span className="flex-1 text-sm text-content-primary">{opt}</span>
                      <button onClick={() => removeOption(idx)} className="text-content-muted hover:text-danger">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      value={newOptionText}
                      onChange={(e) => setNewOptionText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                      placeholder="선택지 입력 후 Enter"
                      className="flex-1 border border-line bg-surface-secondary px-2 py-1 text-xs text-content-primary"
                    />
                    <button onClick={addOption} disabled={!newOptionText.trim()} className="px-2 py-1 text-xs bg-accent text-accent-text disabled:opacity-50">
                      추가
                    </button>
                  </div>
                </div>
              )}

              {/* 대상 부서/직급 설정 */}
              {(departments.length > 0 || positions.length > 0) && (
                <div className="border border-line p-3 space-y-2">
                  <p className="text-xs font-medium text-content-secondary">대상 설정 (비어있으면 전체 대상)</p>
                  {departments.length > 0 && (
                    <div>
                      <p className="text-xs text-content-muted mb-1">부서</p>
                      <div className="flex flex-wrap gap-1.5">
                        {departments.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => toggleDept(d.id)}
                            className={`px-2 py-0.5 text-xs transition-colors ${
                              editTargetDepts.includes(d.id)
                                ? 'bg-accent text-accent-text'
                                : 'bg-surface-hover text-content-secondary hover:bg-surface-hover'
                            }`}
                          >
                            {d.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {positions.length > 0 && (
                    <div>
                      <p className="text-xs text-content-muted mb-1">직급</p>
                      <div className="flex flex-wrap gap-1.5">
                        {positions.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => togglePosition(p.id)}
                            className={`px-2 py-0.5 text-xs transition-colors ${
                              editTargetPositions.includes(p.id)
                                ? 'bg-accent text-accent-text'
                                : 'bg-surface-hover text-content-secondary hover:bg-surface-hover'
                            }`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                {question.sub_category && (
                  <span className="bg-surface-hover px-2 py-0.5 text-xs text-content-tertiary">
                    {question.sub_category}
                  </span>
                )}
                <span className={`px-2 py-0.5 text-xs ${IMPORTANCE_COLORS[importance] || IMPORTANCE_COLORS['important']}`}>
                  {IMPORTANCE_LABELS[importance] || '중요'}
                </span>
                {(question.target_departments?.length ?? 0) > 0 && (
                  <span className="bg-surface-hover px-2 py-0.5 text-xs text-content-tertiary">
                    부서: {question.target_departments!.map((did) => departments.find((d) => d.id === did)?.name || did).join(', ')}
                  </span>
                )}
                {(question.target_positions?.length ?? 0) > 0 && (
                  <span className="bg-surface-hover px-2 py-0.5 text-xs text-content-tertiary">
                    직급: {question.target_positions!.map((pid) => positions.find((p) => p.id === pid)?.name || pid).join(', ')}
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
                  {isChoiceType(qType) && optionTexts.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-content-tertiary mb-1">선택지:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {optionTexts.map((opt, i) => (
                          <span key={i} className="bg-surface-hover px-2 py-0.5 text-xs text-content-secondary">{opt}</span>
                        ))}
                      </div>
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

function SectionBlock({
  section,
  projectId,
  locked,
  aiProvider,
  sensors,
  onDragEnd,
  onDeleteQuestion,
  departments = [],
  positions = [],
}: {
  section: QuestionSection;
  projectId: number;
  locked: boolean;
  aiProvider: AiProvider;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  onDeleteQuestion: (id: number) => void;
  departments?: { id: number; name: string }[];
  positions?: { id: number; name: string }[];
}) {
  const deleteSection = useDeleteSection();
  const generateSectionQuestions = useGenerateSectionQuestions();
  const [genCount, setGenCount] = useState(3);
  const [showGenForm, setShowGenForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sectionQuestions = section.questions ?? [];

  const handleDeleteSection = async () => {
    try {
      await deleteSection.mutateAsync({ projectId, sectionId: section.id });
      toast.success('섹션이 삭제되었습니다.');
    } catch {
      toast.error('섹션 삭제에 실패했습니다.');
    }
  };

  const handleGenerateQuestions = async () => {
    try {
      await generateSectionQuestions.mutateAsync({
        projectId,
        sectionId: section.id,
        count: genCount,
        ai_provider: aiProvider,
      });
      setShowGenForm(false);
      toast.success(`${genCount}개 질문이 추가되었습니다.`);
    } catch {
      toast.error('AI 질문 생성에 실패했습니다.');
    }
  };

  return (
    <div className="border border-line bg-surface-secondary p-5">
      {/* Section header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-content-primary">{section.title}</h3>
            {section.importance && (
              <span className={`px-2 py-0.5 text-xs font-medium ${SECTION_IMPORTANCE_COLORS[section.importance] || SECTION_IMPORTANCE_COLORS['medium']}`}>
                {SECTION_IMPORTANCE_LABELS[section.importance] || '중'}
              </span>
            )}
            {section.target_area && (
              <span className="bg-surface-hover px-2 py-0.5 text-xs text-content-tertiary">
                {section.target_area}
              </span>
            )}
            <span className="text-xs text-content-muted">{sectionQuestions.length}개 질문</span>
          </div>
          {section.description && (
            <p className="mt-1 text-xs text-content-tertiary">{section.description}</p>
          )}
        </div>

        {!locked && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* AI generate button */}
            {!showGenForm && (
              <button
                onClick={() => setShowGenForm(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-accent hover:bg-surface-hover"
                title="AI로 질문 추가 생성"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI 추가
              </button>
            )}
            {/* Delete section */}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1 text-content-muted hover:text-danger"
                title="섹션 삭제"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDeleteSection}
                  disabled={deleteSection.isPending}
                  className="px-2 py-1 text-xs text-danger bg-danger-bg hover:opacity-80 disabled:opacity-50"
                >
                  {deleteSection.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : '삭제'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 text-xs text-content-secondary hover:bg-surface-hover"
                >
                  취소
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI generate form */}
      {showGenForm && !locked && (
        <div className="mb-3 flex items-center gap-2 border border-line bg-surface-hover p-3">
          <Sparkles className="h-4 w-4 text-accent flex-shrink-0" />
          <span className="text-xs text-content-secondary">추가 생성할 질문 수:</span>
          <input
            type="number"
            min={1}
            max={10}
            value={genCount}
            onChange={(e) => setGenCount(Math.max(1, Math.min(10, Number(e.target.value))))}
            className="w-16 border border-line bg-surface-secondary px-2 py-1 text-xs text-content-primary text-center"
          />
          <button
            onClick={handleGenerateQuestions}
            disabled={generateSectionQuestions.isPending}
            className="inline-flex items-center gap-1.5 bg-accent px-3 py-1.5 text-xs font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
          >
            {generateSectionQuestions.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            생성
          </button>
          <button
            onClick={() => setShowGenForm(false)}
            className="px-2 py-1.5 text-xs text-content-secondary hover:bg-surface-hover"
          >
            취소
          </button>
        </div>
      )}

      {/* Questions */}
      {sectionQuestions.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={sectionQuestions.map((q) => q.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sectionQuestions.map((question) => (
                <SortableQuestion
                  key={question.id}
                  question={question}
                  projectId={projectId}
                  onDelete={onDeleteQuestion}
                  locked={locked}
                  departments={departments}
                  positions={positions}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-xs text-content-tertiary">이 섹션에 질문이 없습니다.</p>
      )}
    </div>
  );
}

export default function QuestionnairePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId ? Number(projectId) : undefined;
  const { data: project } = useProject(id);
  const { data: departments = [] } = useDepartments(id);
  const { data: positions = [] } = usePositions(id);
  const { data: questionnaire, isLoading, refetch: refetchQuestionnaire } = useQuestionnaire(id);
  const generateQuestionnaire = useGenerateQuestionnaire();
  const confirmQuestionnaire = useConfirmQuestionnaire();
  const createQuestion = useCreateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const reorderQuestions = useReorderQuestions();
  const createSection = useCreateSection();
  const { data: templates = [] } = useQuestionnaireTemplates(id);
  const importQuestionnaire = useImportQuestionnaire();
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRefOptions, setShowRefOptions] = useState(false);
  const [selectedRefIds, setSelectedRefIds] = useState<number[]>([]);
  const [aiProvider, setAiProvider] = useState<AiProvider>(DEFAULT_AI_PROVIDER);
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: '', question_type: 'textarea' as string, importance: 'important' as string, purpose: '', description: '', sub_category: '', section: null as number | null, options: [] as string[], target_departments: [] as number[], target_positions: [] as number[] });
  const [newOptionText, setNewOptionText] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');
  const [newSectionImportance, setNewSectionImportance] = useState('medium');
  const [newSectionTargetArea, setNewSectionTargetArea] = useState('공통');

  // Polling — starts automatically if status is processing (survives refresh)
  const shouldPoll = questionnaire?.status === 'processing';
  const { data: statusData } = useQuestionnaireStatus(id, shouldPoll);

  useEffect(() => {
    if (statusData && statusData.status !== 'processing') {
      refetchQuestionnaire();
    }
  }, [statusData?.status, refetchQuestionnaire]);

  const isProcessing = questionnaire?.status === 'processing';
  const isFailed = questionnaire?.status === 'failed';
  const isConfirmed = questionnaire?.status === 'confirmed';

  const { canEdit } = useMyRole(id);
  const editDisabledTitle = canEdit ? '' : '뷰어 권한은 편집할 수 없습니다. 편집자 이상 권한이 필요합니다.';
  const lockEdit = !!isConfirmed || !canEdit;

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

  const sections = questionnaire?.sections ?? [];
  const questions = questionnaire?.questions ?? [];
  const categories = questionnaire?.categories ?? [];
  const filteredQuestions =
    categoryFilter === 'all'
      ? questions
      : questions.filter((q) => q.categoryId === categoryFilter);

  const handleImport = async (sourceProjectId: number) => {
    if (!id) return;
    try {
      const result = await importQuestionnaire.mutateAsync({ projectId: id, sourceProjectId });
      setShowImportModal(false);
      toast.success(result.detail || '질문지를 불러왔습니다.');
    } catch {
      toast.error('질문지 불러오기에 실패했습니다.');
    }
  };

  const handleGenerate = async () => {
    if (!id) return;
    try {
      await generateQuestionnaire.mutateAsync({
        projectId: id,
        ai_provider: aiProvider,
        reference_project_ids: selectedRefIds.length > 0 ? selectedRefIds : undefined,
      } as any);
      setSelectedRefIds([]);
      setShowRefOptions(false);
      refetchQuestionnaire();
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
          sub_category: newQuestion.sub_category || undefined,
          section: newQuestion.section,
          options: isChoiceType(newQuestion.question_type) ? newQuestion.options : undefined,
          target_departments: newQuestion.target_departments.length > 0 ? newQuestion.target_departments : undefined,
          target_positions: newQuestion.target_positions.length > 0 ? newQuestion.target_positions : undefined,
        },
      });
      setNewQuestion({ text: '', question_type: 'textarea', importance: 'important', purpose: '', description: '', sub_category: '', section: null, options: [], target_departments: [], target_positions: [] });
      setNewOptionText('');
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

  const handleAddSection = async () => {
    if (!id || !newSectionTitle.trim()) return;
    try {
      await createSection.mutateAsync({
        projectId: id,
        data: {
          title: newSectionTitle.trim(),
          description: newSectionDesc.trim() || undefined,
          importance: newSectionImportance,
          target_area: newSectionTargetArea.trim() || undefined,
        },
      });
      setNewSectionTitle('');
      setNewSectionDesc('');
      setNewSectionImportance('medium');
      setNewSectionTargetArea('공통');
      setShowAddSection(false);
      toast.success('섹션이 추가되었습니다.');
    } catch {
      toast.error('섹션 추가에 실패했습니다.');
    }
  };

  const inputClass =
    'w-full border border-line bg-surface-secondary px-3 py-2 text-sm text-content-primary';

  const totalQuestions = filteredQuestions.length + sections.reduce((sum, s) => sum + (s.questions?.length ?? 0), 0);

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
          {!lockEdit && (
            <>
              <AiProviderSelect value={aiProvider} onChange={setAiProvider} />
              {/* 이전 질문지 불러오기 */}
              {templates.length > 0 && (
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center gap-2 border border-line px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover"
                >
                  <Copy className="h-4 w-4" />
                  불러오기
                </button>
              )}
              {/* 초기 생성 버튼: 질문이 없을 때만 표시 */}
              {totalQuestions === 0 && sections.length === 0 && (
                <button
                  onClick={handleGenerate}
                  disabled={generateQuestionnaire.isPending || isProcessing || !canEdit}
                  title={editDisabledTitle}
                  className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generateQuestionnaire.isPending || isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  AI 질문지 생성
                </button>
              )}
              {totalQuestions > 0 && (
                <button
                  onClick={handleConfirm}
                  disabled={confirmQuestionnaire.isPending || !canEdit}
                  title={editDisabledTitle}
                  className="inline-flex items-center gap-2 bg-success px-4 py-2 text-sm font-medium text-accent-text hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* Add Section */}
      {!lockEdit && (
        <div>
          {!showAddSection ? (
            <button
              onClick={() => setShowAddSection(true)}
              className="inline-flex items-center gap-2 border border-line px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-hover"
            >
              <Plus className="h-4 w-4" />
              섹션 추가
            </button>
          ) : (
            <div className="border border-line bg-surface-hover p-4 space-y-3">
              <h3 className="text-sm font-semibold text-content-primary">새 섹션 추가</h3>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="섹션 제목"
                  className="border border-line bg-surface-secondary px-3 py-2 text-sm text-content-primary"
                />
                <select
                  value={newSectionImportance}
                  onChange={(e) => setNewSectionImportance(e.target.value)}
                  className="border border-line bg-surface-secondary px-3 py-2 text-sm text-content-primary"
                >
                  {SECTION_IMPORTANCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>중요도: {opt.label}</option>
                  ))}
                </select>
                <input
                  value={newSectionTargetArea}
                  onChange={(e) => setNewSectionTargetArea(e.target.value)}
                  placeholder="질문영역 (e.g., 공통, FO)"
                  className="border border-line bg-surface-secondary px-3 py-2 text-sm text-content-primary"
                />
              </div>
              <input
                value={newSectionDesc}
                onChange={(e) => setNewSectionDesc(e.target.value)}
                placeholder="섹션 설명 (선택)"
                className="w-full border border-line bg-surface-secondary px-3 py-2 text-sm text-content-primary"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddSection}
                  disabled={createSection.isPending || !newSectionTitle.trim()}
                  className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
                >
                  {createSection.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  추가
                </button>
                <button
                  onClick={() => { setShowAddSection(false); setNewSectionTitle(''); setNewSectionDesc(''); setNewSectionImportance('medium'); setNewSectionTargetArea('공통'); }}
                  className="border border-line px-4 py-2 text-sm text-content-secondary hover:bg-surface-hover"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Question Add */}
      {!lockEdit && !showAddForm ? (
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
            <input
              value={newQuestion.sub_category}
              onChange={(e) => setNewQuestion((q) => ({ ...q, sub_category: e.target.value }))}
              placeholder="세부구분 (e.g., 직무/포지션)"
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
                className="border border-line bg-surface-secondary px-3 py-1.5 text-xs text-content-primary"
              >
                {Object.entries(QUESTION_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <select
                value={newQuestion.importance}
                onChange={(e) => setNewQuestion((q) => ({ ...q, importance: e.target.value }))}
                className="border border-line bg-surface-secondary px-3 py-1.5 text-xs text-content-primary"
              >
                {IMPORTANCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>중요도: {opt.label}</option>
                ))}
              </select>
              {sections.length > 0 && (
                <select
                  value={newQuestion.section ?? ''}
                  onChange={(e) => setNewQuestion((q) => ({ ...q, section: e.target.value ? Number(e.target.value) : null }))}
                  className="border border-line bg-surface-secondary px-3 py-1.5 text-xs text-content-primary"
                >
                  <option value="">섹션 없음</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>{sec.title}</option>
                  ))}
                </select>
              )}
            </div>

            {/* 선택지 (단일선택/복수선택) */}
            {isChoiceType(newQuestion.question_type) && (
              <div className="border border-line p-3 space-y-2">
                <p className="text-xs font-medium text-content-secondary">
                  선택지 {newQuestion.question_type === 'single_choice' ? '(단일선택)' : '(복수선택)'}
                </p>
                {newQuestion.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 text-center text-xs text-content-muted">{idx + 1}</span>
                    <span className="flex-1 text-sm text-content-primary">{opt}</span>
                    <button
                      onClick={() => setNewQuestion((q) => ({ ...q, options: q.options.filter((_, i) => i !== idx) }))}
                      className="text-content-muted hover:text-danger"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    value={newOptionText}
                    onChange={(e) => setNewOptionText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newOptionText.trim()) {
                        e.preventDefault();
                        setNewQuestion((q) => ({ ...q, options: [...q.options, newOptionText.trim()] }));
                        setNewOptionText('');
                      }
                    }}
                    placeholder="선택지 입력 후 Enter"
                    className="flex-1 border border-line bg-surface-secondary px-2 py-1 text-xs text-content-primary"
                  />
                  <button
                    onClick={() => {
                      if (newOptionText.trim()) {
                        setNewQuestion((q) => ({ ...q, options: [...q.options, newOptionText.trim()] }));
                        setNewOptionText('');
                      }
                    }}
                    disabled={!newOptionText.trim()}
                    className="px-2 py-1 text-xs bg-accent text-accent-text disabled:opacity-50"
                  >
                    추가
                  </button>
                </div>
              </div>
            )}

            {/* 대상 부서/직급 */}
            {(departments.length > 0 || positions.length > 0) && (
              <div className="border border-line p-3 space-y-2">
                <p className="text-xs font-medium text-content-secondary">대상 설정 (비어있으면 전체 대상)</p>
                {departments.length > 0 && (
                  <div>
                    <p className="text-xs text-content-muted mb-1">부서</p>
                    <div className="flex flex-wrap gap-1.5">
                      {departments.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setNewQuestion((q) => ({
                            ...q,
                            target_departments: q.target_departments.includes(d.id)
                              ? q.target_departments.filter((id) => id !== d.id)
                              : [...q.target_departments, d.id],
                          }))}
                          className={`px-2 py-0.5 text-xs transition-colors ${
                            newQuestion.target_departments.includes(d.id)
                              ? 'bg-accent text-accent-text'
                              : 'bg-surface-hover text-content-secondary hover:bg-surface-hover'
                          }`}
                        >
                          {d.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {positions.length > 0 && (
                  <div>
                    <p className="text-xs text-content-muted mb-1">직급</p>
                    <div className="flex flex-wrap gap-1.5">
                      {positions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setNewQuestion((q) => ({
                            ...q,
                            target_positions: q.target_positions.includes(p.id)
                              ? q.target_positions.filter((id) => id !== p.id)
                              : [...q.target_positions, p.id],
                          }))}
                          className={`px-2 py-0.5 text-xs transition-colors ${
                            newQuestion.target_positions.includes(p.id)
                              ? 'bg-accent text-accent-text'
                              : 'bg-surface-hover text-content-secondary hover:bg-surface-hover'
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
      ) : !isProcessing && totalQuestions === 0 && !showAddForm ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-line py-8 space-y-4">
          <p className="text-sm text-content-tertiary">
            질문이 없습니다. AI 생성 또는 직접 추가해주세요.
          </p>
          {/* 이전 질문지 참고 옵션 */}
          {templates.length > 0 && !lockEdit && (
            <div className="w-full max-w-md space-y-2 px-6">
              <button
                onClick={() => setShowRefOptions(!showRefOptions)}
                className="text-xs text-accent hover:underline"
              >
                {showRefOptions ? '참고 옵션 닫기' : '이전 질문지 참고하여 AI 생성'}
              </button>
              {showRefOptions && (
                <div className="border border-line bg-surface-secondary p-3 space-y-2">
                  <p className="text-xs text-content-muted">참고할 프로젝트를 선택하세요 (최대 3개). AI가 구조를 참고하여 현재 프로젝트에 맞게 생성합니다.</p>
                  {templates.map((t) => (
                    <label key={t.project_id} className="flex items-center gap-2 text-sm text-content-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRefIds.includes(t.project_id)}
                        onChange={() => setSelectedRefIds((prev) =>
                          prev.includes(t.project_id)
                            ? prev.filter((id) => id !== t.project_id)
                            : prev.length < 3 ? [...prev, t.project_id] : prev
                        )}
                        className="text-accent"
                      />
                      <span>{t.project_title}</span>
                      <span className="text-xs text-content-muted">({t.client_name} · {t.section_count}섹션 {t.question_count}문항)</span>
                    </label>
                  ))}
                  {selectedRefIds.length > 0 && (
                    <button
                      onClick={handleGenerate}
                      disabled={generateQuestionnaire.isPending}
                      className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-xs font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
                    >
                      {generateQuestionnaire.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {selectedRefIds.length}개 참고하여 AI 생성
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : sections.length > 0 ? (
        <>
          <p className="text-xs text-content-tertiary">총 {totalQuestions}개 질문</p>

          {/* Section-based questions */}
          <div className="space-y-4">
            {sections
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <SectionBlock
                  key={section.id}
                  section={section}
                  projectId={id!}
                  locked={lockEdit}
                  aiProvider={aiProvider}
                  sensors={sensors}
                  onDragEnd={handleDragEnd}
                  onDeleteQuestion={(qId) => setConfirmDeleteId(qId)}
                  departments={departments}
                  positions={positions}
                />
              ))}
          </div>

          {/* Unsectioned questions */}
          {filteredQuestions.length > 0 && (
            <div className="border border-line bg-surface-secondary p-5">
              <div className="mb-3">
                <h3 className="text-base font-bold text-content-primary">기타 질문</h3>
              </div>
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
                        locked={lockEdit}
                        departments={departments}
                        positions={positions}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </>
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
                    locked={lockEdit}
                    departments={departments}
                    positions={positions}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      ) : null}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.6)] p-4">
          <div className="w-full max-w-lg bg-surface-secondary p-6">
            <h3 className="text-lg font-semibold text-content-primary">이전 질문지 불러오기</h3>
            <p className="mt-1 text-sm text-content-tertiary">선택한 프로젝트의 질문지를 현재 프로젝트에 복사합니다.</p>
            <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
              {templates.map((t) => (
                <div
                  key={t.project_id}
                  className="flex items-center justify-between border border-line p-3 hover:bg-surface-hover transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-content-primary truncate">{t.project_title}</p>
                    <p className="text-xs text-content-tertiary">{t.client_name} · {t.section_count}개 섹션 · {t.question_count}개 질문</p>
                  </div>
                  <button
                    onClick={() => handleImport(t.project_id)}
                    disabled={importQuestionnaire.isPending}
                    className="ml-3 flex-shrink-0 inline-flex items-center gap-1.5 bg-accent px-3 py-1.5 text-xs font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
                  >
                    {importQuestionnaire.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />}
                    불러오기
                  </button>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="py-4 text-center text-sm text-content-tertiary">불러올 수 있는 질문지가 없습니다.</p>
              )}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="border border-line px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

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
