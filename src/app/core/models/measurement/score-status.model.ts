/**
 * Trạng thái điểm của một câu hỏi/tiêu chí (GiaiThich_CoSoDuLieu.md §4.22, collection `scores`).
 * `BLANK` là 0 có ghi nhận (đã dự thi bỏ trống); 4 trạng thái còn lại không phải `SCORED` đều có `rawScore = null`.
 */
export type ScoreStatus = 'SCORED' | 'BLANK' | 'ABSENT' | 'NOT_GRADED' | 'EXEMPT' | 'MISSING';
