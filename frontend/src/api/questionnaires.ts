import apiClient from './client';
import type {
  Questionnaire,
  QuestionnaireUpdateRequest,
  Question,
  QuestionCreateRequest,
  QuestionUpdateRequest,
  QuestionReorderRequest,
  PositionCategory,
  PositionCategoryCreateRequest,
  PositionCategoryUpdateRequest,
} from '../types/questionnaire';

// Questionnaire
export const generateQuestionnaire = async (projectId: number): Promise<Questionnaire> => {
  const response = await apiClient.post<Questionnaire>(
    `/projects/${projectId}/questionnaire/generate/`,
  );
  return response.data;
};

export const getQuestionnaire = async (projectId: number): Promise<Questionnaire> => {
  const response = await apiClient.get<Questionnaire>(`/projects/${projectId}/questionnaire/`);
  return response.data;
};

export const updateQuestionnaire = async (
  projectId: number,
  data: QuestionnaireUpdateRequest,
): Promise<Questionnaire> => {
  const response = await apiClient.patch<Questionnaire>(
    `/projects/${projectId}/questionnaire/`,
    data,
  );
  return response.data;
};

// Questions
export const getQuestions = async (projectId: number): Promise<Question[]> => {
  const response = await apiClient.get<Question[]>(
    `/projects/${projectId}/questionnaire/questions/`,
  );
  return response.data;
};

export const createQuestion = async (
  projectId: number,
  data: QuestionCreateRequest,
): Promise<Question> => {
  const response = await apiClient.post<Question>(
    `/projects/${projectId}/questionnaire/questions/`,
    data,
  );
  return response.data;
};

export const updateQuestion = async (
  projectId: number,
  questionId: number,
  data: QuestionUpdateRequest,
): Promise<Question> => {
  const response = await apiClient.patch<Question>(
    `/projects/${projectId}/questionnaire/questions/${questionId}/`,
    data,
  );
  return response.data;
};

export const deleteQuestion = async (projectId: number, questionId: number): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/questionnaire/questions/${questionId}/`);
};

export const reorderQuestions = async (
  projectId: number,
  data: QuestionReorderRequest,
): Promise<void> => {
  await apiClient.post(`/projects/${projectId}/questionnaire/questions/reorder/`, data);
};

// Position Categories
export const getPositionCategories = async (projectId: number): Promise<PositionCategory[]> => {
  const response = await apiClient.get<PositionCategory[]>(
    `/projects/${projectId}/questionnaire/categories/`,
  );
  return response.data;
};

export const createPositionCategory = async (
  projectId: number,
  data: PositionCategoryCreateRequest,
): Promise<PositionCategory> => {
  const response = await apiClient.post<PositionCategory>(
    `/projects/${projectId}/questionnaire/categories/`,
    data,
  );
  return response.data;
};

export const updatePositionCategory = async (
  projectId: number,
  categoryId: number,
  data: PositionCategoryUpdateRequest,
): Promise<PositionCategory> => {
  const response = await apiClient.patch<PositionCategory>(
    `/projects/${projectId}/questionnaire/categories/${categoryId}/`,
    data,
  );
  return response.data;
};

export const deletePositionCategory = async (
  projectId: number,
  categoryId: number,
): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/questionnaire/categories/${categoryId}/`);
};
