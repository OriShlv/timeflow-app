import { ApiError } from './apiClient';

const API_ERROR_MESSAGES: Record<string, string> = {
  FocusSessionAlreadyRunning:
    'You already have a focus session running. Stop it from the focus bar at the bottom.',
  FocusSessionNotFound: 'Focus session not found.',
  FocusSessionNotRunning: 'This focus session is no longer running.',
  InvalidFocusSessionEndTime: 'Could not end the focus session because the end time is invalid.',
  TaskNotFound: 'Task not found.',
  Unauthorized: 'Your session expired. Please log in again.',
  PlannerLlmUnavailable:
    'The planner AI is unavailable. Make sure Ollama is running and the model is pulled.',
  PlannerLlmInvalidJson: 'The planner AI returned an invalid response. Try again.',
  PlannerLlmInvalidShape: 'The planner AI returned an unexpected response. Try again.',
  ParentTaskNotFound: 'Parent task not found.',
  ParentTaskNotAllowed: 'Sub-tasks cannot be nested under another sub-task.',
  InvalidPlannerRequest: 'Invalid planner request.',
};

export function toUiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const mapped = API_ERROR_MESSAGES[error.message];
    if (mapped !== undefined) {
      return mapped;
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Request failed';
}
