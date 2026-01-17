import { Models } from "appwrite";
import CommentForm from "./CommentForm";
import { useUserContext } from "@/context/AuthContext";
import { multiFormatDateString } from "@/lib/utils";
import { Loader } from "@/components/shared";

type CommentsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  comments: Models.Document[] | undefined;
  isLoadingComments: boolean;
  onCommentSubmit: (commentText: string) => void;
  isSubmittingComment: boolean;
  onDeleteComment: (commentId: string) => void;
  isDeletingComment: boolean;
};

const CommentsModal = ({
  isOpen,
  onClose,
  comments,
  isLoadingComments,
  onCommentSubmit,
  isSubmittingComment,
  onDeleteComment,
  isDeletingComment,
}: CommentsModalProps) => {
  const { user } = useUserContext();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-dark-2 rounded-lg w-full max-w-2xl max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-dark-4">
          <h2 className="text-lg font-semibold text-light-1">Comments</h2>
          <button
            onClick={onClose}
            className="text-light-3 hover:text-light-1 transition"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingComments ? (
            <div className="flex justify-center">
              <Loader />
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => {
                const creatorData = comment.creator;
                return (
                <div key={comment.$id} className="flex gap-3">
                  <img
                    src={
                      creatorData?.imageUrl ||
                      "/assets/icons/profile-placeholder.svg"
                    }
                    alt={creatorData?.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-light-1">
                        {creatorData?.name}
                      </p>
                      <p className="text-xs text-light-3">
                        {multiFormatDateString(comment.$createdAt)}
                      </p>
                    </div>
                    <p className="text-light-2 text-sm mt-1">
                      {comment.commentText}
                    </p>
                  </div>
                  {user.id === creatorData?.$id && (
                    <button
                      onClick={() => onDeleteComment(comment.$id)}
                      disabled={isDeletingComment}
                      className="text-light-4 hover:text-red-500 transition text-xs"
                    >
                      Delete
                    </button>
                  )}
                </div>
              );
              })}
            </div>
          ) : (
            <p className="text-center text-light-4">No comments yet</p>
          )}
        </div>

        {/* Comment Form */}
        <div className="border-t border-dark-4 p-4">
          <CommentForm
            onCommentSubmit={onCommentSubmit}
            isLoading={isSubmittingComment}
          />
        </div>
      </div>
    </div>
  );
};

export default CommentsModal;
