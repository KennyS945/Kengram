import { Models } from "appwrite";
import { Link } from "react-router-dom";
import { useState } from "react";

import { PostStats, CommentsModal } from "@/components/shared";
import { multiFormatDateString } from "@/lib/utils";
import { useUserContext } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPostComments, createComment, deleteComment } from "@/lib/appwrite/api";

type PostCardProps = {
  post: Models.Document;
};

const PostCard = ({ post }: PostCardProps) => {
  const { user } = useUserContext();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const queryClient = useQueryClient();

  if (!post.creator) return;

  const images = post.imageUrls && Array.isArray(post.imageUrls) && post.imageUrls.length > 0
    ? post.imageUrls
    : (post.imageUrl ? [post.imageUrl] : ["/assets/icons/profile-placeholder.svg"]);

  const currentImage = images[currentImageIndex];
  const hasMultipleImages = images.length > 1;

  // Get comments
  const { data: commentsData, isLoading: isLoadingComments } = useQuery({
    queryKey: ["comments", post.$id],
    queryFn: () => getPostComments(post.$id),
  });

  // Create comment mutation
  const { mutate: createCommentMutation, isLoading: isCreatingComment } = useMutation({
    mutationFn: (commentText: string) => 
      createComment(user.id, post.$id, commentText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", post.$id] });
    },
  });

  // Delete comment mutation
  const { mutate: deleteCommentMutation, isLoading: isDeletingComment } = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", post.$id] });
    },
  });

  const handleCommentClick = () => {
    setIsCommentsOpen(true);
  };

  const handleCommentSubmit = (commentText: string) => {
    createCommentMutation(commentText);
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="post-card">
      <div className="flex-between">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${post.creator.$id}`}>
            <img
              src={
                post.creator?.imageUrl ||
                "/assets/icons/profile-placeholder.svg"
              }
              alt="creator"
              className="w-12 lg:h-12 rounded-full cursor-pointer hover:opacity-80 transition"
            />
          </Link>

          <Link to={`/profile/${post.creator.$id}`} className="flex-1">
            <div className="flex flex-col">
              <p className="base-medium lg:body-bold text-light-1 hover:text-light-2 cursor-pointer transition">
                {post.creator.name}
              </p>
              <div className="flex-center gap-2 text-light-3">
                <p className="subtle-semibold lg:small-regular ">
                  {multiFormatDateString(post.$createdAt)}
                </p>
                •
                <p className="subtle-semibold lg:small-regular">
                  {post.location}
                </p>
              </div>
            </div>
          </Link>
        </div>

        <Link
          to={`/update-post/${post.$id}`}
          className={`${user.id !== post.creator.$id && "hidden"}`}>
          <img
            src={"/assets/icons/edit.svg"}
            alt="edit"
            width={20}
            height={20}
          />
        </Link>
      </div>

      <Link to={`/posts/${post.$id}`}>
        <div className="small-medium lg:base-medium py-5">
          <p>{post.caption}</p>
          <ul className="flex gap-1 mt-2">
            {post.tags?.map((tag: string, index: string) => (
              <li key={`${tag}${index}`} className="text-light-3 small-regular">
                #{tag}
              </li>
            ))}
          </ul>
        </div>

        {/* Image carousel - Instagram style */}
        <div className="relative bg-dark-4 flex items-center justify-center overflow-hidden rounded-lg" style={{ aspectRatio: '1 / 1' }}>
          <img
            src={currentImage}
            alt={`post image ${currentImageIndex}`}
            className="w-full h-full object-contain"
          />

          {/* Left arrow */}
          {hasMultipleImages && (
            <button
              onClick={handlePrevious}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-r-md transition"
              aria-label="Previous image">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Right arrow */}
          {hasMultipleImages && (
            <button
              onClick={handleNext}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-l-md transition"
              aria-label="Next image">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* Image counter */}
          {hasMultipleImages && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
              {currentImageIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </Link>

      <div className="flex gap-1 items-center">
        <PostStats 
          post={post} 
          userId={user.id}
          onCommentClick={handleCommentClick}
          commentCount={commentsData?.documents?.length || 0}
        />
      </div>

      {isCommentsOpen && (
        <CommentsModal
          isOpen={isCommentsOpen}
          comments={commentsData?.documents || []}
          isLoadingComments={isLoadingComments}
          onClose={() => setIsCommentsOpen(false)}
          onCommentSubmit={handleCommentSubmit}
          onDeleteComment={deleteCommentMutation}
          isDeletingComment={isDeletingComment}
          isSubmittingComment={isCreatingComment}
        />
      )}
    </div>
  );
};

export default PostCard;
