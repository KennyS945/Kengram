import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import { Button } from "@/components/ui";
import { Loader, CommentsModal } from "@/components/shared";
import { GridPostList, PostStats } from "@/components/shared";
import { useToast } from "@/components/ui/use-toast";

import {
  useGetPostById,
  useGetUserPosts,
  useDeletePost,
} from "@/lib/react-query/queries";
import { multiFormatDateString } from "@/lib/utils";
import { useUserContext } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPostComments, createComment, deleteComment } from "@/lib/appwrite/api";

const PostDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useUserContext();
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();

  const { data: post, isLoading } = useGetPostById(id);
  const { data: userPosts, isLoading: isUserPostLoading } = useGetUserPosts(
    post?.creator?.$id
  );
  const { mutate: deletePost, isLoading: isDeletingPost } = useDeletePost();

  // Get comments
  const { data: commentsData, isLoading: isLoadingComments } = useQuery({
    queryKey: ["comments", id],
    queryFn: () => getPostComments(id || ""),
    enabled: !!id,
  });

  // Create comment mutation
  const { mutate: createCommentMutation, isLoading: isCreatingComment } = useMutation({
    mutationFn: (commentText: string) => 
      createComment(user.id, id || "", commentText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
    },
  });

  // Delete comment mutation
  const { mutate: deleteCommentMutation, isLoading: isDeletingComment } = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
    },
  });

  const relatedPosts = userPosts?.documents.filter(
    (userPost) => userPost.$id !== id
  );

  const handleDeletePost = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeletePost = () => {
    setShowDeleteConfirm(false);
    try {
      deletePost(
        { postId: id, imageId: post?.imageIds || post?.imageId },
        {
          onSuccess: () => {
            toast({
              title: "Success",
              description: "Post deleted successfully",
            });
            navigate(-1);
          },
          onError: (error: any) => {
            toast({
              title: "Error",
              description: error?.message || "Failed to delete post",
              variant: "destructive",
            });
          },
        }
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: "An error occurred while deleting the post",
        variant: "destructive",
      });
    }
  };

  const cancelDeletePost = () => {
    setShowDeleteConfirm(false);
  };

  const handleCommentClick = () => {
    setIsCommentsOpen(true);
  };

  const handleCommentSubmit = (commentText: string) => {
    createCommentMutation(commentText);
  };

  return (
    <div className="post_details-container">
      <div className="hidden md:flex max-w-5xl w-full">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="shad-button_ghost">
          <img
            src={"/assets/icons/back.svg"}
            alt="back"
            width={24}
            height={24}
          />
          <p className="small-medium lg:base-medium">Back</p>
        </Button>
      </div>

      {isLoading || !post ? (
        <Loader />
      ) : (
        <div className="post_details-card">
          {/* Image carousel */}
          {(() => {
            const images = post?.imageUrls && Array.isArray(post.imageUrls) && post.imageUrls.length > 0
              ? post.imageUrls
              : (post?.imageUrl ? [post.imageUrl] : []);
            const hasMultipleImages = images.length > 1;
            const currentImage = images[currentImageIndex] || post?.imageUrl;

            const handlePrevious = () => {
              setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
            };

            const handleNext = () => {
              setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
            };

            return (
              <div className="relative bg-dark-4 flex items-center justify-center overflow-hidden rounded-lg" style={{ aspectRatio: '1 / 1', maxHeight: '500px' }}>
                <img
                  src={currentImage}
                  alt="post"
                  className="w-full h-full object-contain"
                />
                {hasMultipleImages && (
                  <>
                    <button
                      onClick={handlePrevious}
                      className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-r-md transition"
                      aria-label="Previous image">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleNext}
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-l-md transition"
                      aria-label="Next image">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          <div className="post_details-info">
            <div className="flex-between w-full">
              <Link
                to={`/profile/${post?.creator.$id}`}
                className="flex items-center gap-3">
                <img
                  src={
                    post?.creator?.imageUrl ||
                    "/assets/icons/profile-placeholder.svg"
                  }
                  alt="creator"
                  className="w-8 h-8 lg:w-12 lg:h-12 rounded-full"
                />
                <div className="flex gap-1 flex-col">
                  <p className="base-medium lg:body-bold text-light-1">
                    {post?.creator?.name}
                  </p>
                  <div className="flex-center gap-2 text-light-3">
                    <p className="subtle-semibold lg:small-regular ">
                      {multiFormatDateString(post?.$createdAt)}
                    </p>
                    •
                    <p className="subtle-semibold lg:small-regular">
                      {post?.location}
                    </p>
                  </div>
                </div>
              </Link>

              <div className="flex-center gap-4">
                <Link
                  to={`/update-post/${post?.$id}`}
                  className={`${user.id !== post?.creator?.$id && "hidden"}`}>
                  <img
                    src={"/assets/icons/edit.svg"}
                    alt="edit"
                    width={24}
                    height={24}
                  />
                </Link>

                <Button
                  onClick={handleDeletePost}
                  variant="ghost"
                  className={`ost_details-delete_btn ${
                    user.id !== post?.creator?.$id && "hidden"
                  }`}>
                  <img
                    src={"/assets/icons/delete.svg"}
                    alt="delete"
                    width={24}
                    height={24}
                  />
                </Button>
              </div>
            </div>

            <hr className="border w-full border-dark-4/80" />

            <div className="flex flex-col flex-1 w-full small-medium lg:base-regular">
              <p>{post?.caption}</p>
              <ul className="flex gap-1 mt-2">
                {post?.tags.map((tag: string, index: string) => (
                  <li
                    key={`${tag}${index}`}
                    className="text-light-3 small-regular">
                    #{tag}
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full">
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
        </div>
      )}

      <div className="w-full max-w-5xl">
        <hr className="border w-full border-dark-4/80" />

        <h3 className="body-bold md:h3-bold w-full my-10">
          More Related Posts
        </h3>
        {isUserPostLoading || !relatedPosts ? (
          <Loader />
        ) : (
          <GridPostList posts={relatedPosts} />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-dark-2 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-light-1 mb-2">Delete Post?</h2>
            <p className="text-light-3 mb-6">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={cancelDeletePost}
                variant="outline"
                className="shad-button_dark_4"
                disabled={isDeletingPost}>
                Cancel
              </Button>
              <Button
                onClick={confirmDeletePost}
                className="shad-button_primary bg-red-500 hover:bg-red-600"
                disabled={isDeletingPost}>
                {isDeletingPost ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDetails;
