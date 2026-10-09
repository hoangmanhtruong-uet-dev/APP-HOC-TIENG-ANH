"use client";


export function SubmitConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  unansweredCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  unansweredCount: number;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Xác nhận nộp bài
        </h3>
        
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">
          Bạn có chắc chắn muốn nộp bài? Kết quả sẽ không thể thay đổi sau khi nộp.
        </p>

        {unansweredCount > 0 && (
          <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-800 dark:text-amber-400 text-sm">
            ⚠️ Bạn vẫn còn <strong>{unansweredCount}</strong> câu hỏi chưa trả lời.
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Làm tiếp
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? "Đang nộp..." : "Nộp bài ngay"}
          </button>
        </div>
      </div>
    </div>
  );
}
