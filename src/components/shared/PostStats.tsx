import { Models } from "appwrite";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

import { checkIsLiked } from "@/lib/utils";
import {
  useLikePost,
  useSavePost,
  useDeleteSavedPost,
  useGetCurrentUser,
  useGetSavedPosts,
} from "@/lib/react-query/queries";

type PostStatsProps = {
  post: Models.Document;
  userId: string;
  onCommentClick?: () => void;
  commentCount?: number;
};

const PostStats = ({ post, userId, onCommentClick, commentCount = 0 }: PostStatsProps) => {
  const location = useLocation();
  const likesList = Array.isArray(post.likes) ? post.likes : [];

  const [likes, setLikes] = useState<string[]>(likesList);
  const [isSaved, setIsSaved] = useState(false);
  const [savedPostId, setSavedPostId] = useState<string | null>(null);

  const { mutate: likePost } = useLikePost();
  const { mutate: savePost } = useSavePost();
  const { mutate: deleteSavePost } = useDeleteSavedPost();

  const { data: currentUser } = useGetCurrentUser();
  const { data: savedPostsData } = useGetSavedPosts(currentUser?.$id || "");

  const savedPosts = savedPostsData?.documents || [];

  // Check if current post is saved
  useEffect(() => {
    const savedPost = savedPosts.find(
      (p: any) => p?.$id === post.$id
    );
    if (savedPost) {
      setIsSaved(true);
      setSavedPostId(savedPost.saveId || null);
    } else {
      setIsSaved(false);
      setSavedPostId(null);
    }
  }, [savedPosts, post.$id]);

  const handleLikePost = (
    e: React.MouseEvent<HTMLImageElement, MouseEvent>
  ) => {
    e.stopPropagation();

    let likesArray = [...likes];

    if (likesArray.includes(userId)) {
      likesArray = likesArray.filter((Id) => Id !== userId);
    } else {
      likesArray.push(userId);
    }

    setLikes(likesArray);
    likePost({ postId: post.$id, likesArray });
  };

  const handleSavePost = (
    e: React.MouseEvent<HTMLImageElement, MouseEvent>
  ) => {
    e.stopPropagation();

    if (isSaved && savedPostId) {
      setIsSaved(false);
      return deleteSavePost(savedPostId);
    }

    savePost({ userId: userId, postId: post.$id });
    setIsSaved(true);
  };

  const containerStyles = location.pathname.startsWith("/profile")
    ? "w-full"
    : "";

  return (
    <div
      className={`flex justify-start gap-5 items-center z-20 pt-4 ${containerStyles}`}>
      <div className="flex gap-0.5 items-center">
        <img
          src={`${
            checkIsLiked(likes, userId)
              ? "/assets/icons/liked.svg"
              : "/assets/icons/like.svg"
          }`}
          alt="like"
          width={30}
          height={30}
          onClick={(e) => handleLikePost(e)}
          className="cursor-pointer"
        />
        <p className="small-medium lg:base-medium">{likes.length}</p>
      </div>

      <div className="flex gap-0.5 items-center">
        <img
          src="/assets/icons/chat.svg"
          alt="comment"
          width={30}
          height={30}
          onClick={onCommentClick}
          className="cursor-pointer hover:opacity-80 transition"
          title="Comment"
        />
        <p className="small-medium lg:base-medium">{commentCount}</p>
      </div>

      <div className="flex gap-2">
        <img
          src={isSaved ? "/assets/icons/saved.svg" : "/assets/icons/save.svg"}
          alt="save"
          width={30}
          height={30}
          className="cursor-pointer"
          onClick={(e) => handleSavePost(e)}
        />
      </div>
    </div>
  );
};

export default PostStats;
