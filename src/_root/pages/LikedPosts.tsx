import { GridPostList, Loader } from "@/components/shared";
import { useUserContext } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getUserLikedPosts } from "@/lib/appwrite/api";

const LikedPosts = () => {
  const { user } = useUserContext();
  
  const { data: likedPosts } = useQuery({
    queryKey: ["likedPosts", user.id],
    queryFn: () => getUserLikedPosts(user.id),
  });

  if (!likedPosts)
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );

  return (
    <>
      {(!likedPosts.documents || likedPosts.documents.length === 0) && (
        <p className="text-light-4">No liked posts</p>
      )}

      <GridPostList posts={likedPosts.documents || []} showStats={false} />
    </>
  );
};

export default LikedPosts;
