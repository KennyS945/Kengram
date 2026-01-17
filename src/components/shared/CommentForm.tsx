import { useState } from "react";
import { useUserContext } from "@/context/AuthContext";
import { Button } from "@/components/ui";

type CommentFormProps = {
  onCommentSubmit: (commentText: string) => void;
  isLoading: boolean;
};

const CommentForm = ({ onCommentSubmit, isLoading }: CommentFormProps) => {
  const { user } = useUserContext();
  const [commentText, setCommentText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onCommentSubmit(commentText);
      setCommentText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <img
        src={user.imageUrl || "/assets/icons/profile-placeholder.svg"}
        alt="user"
        className="w-8 h-8 rounded-full"
      />
      <div className="flex-1">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment..."
          className="w-full bg-dark-3 rounded-lg p-2 text-light-1 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={3}
        />
      </div>
      <Button
        type="submit"
        className="shad-button_primary px-6"
        disabled={!commentText.trim() || isLoading}
      >
        Post
      </Button>
    </form>
  );
};

export default CommentForm;
