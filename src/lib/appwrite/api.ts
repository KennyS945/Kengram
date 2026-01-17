import { ID, Query } from "appwrite";

import { appwriteConfig, account, databases, storage, avatars } from "./config";
import { IUpdatePost, INewPost, INewUser, IUpdateUser } from "@/types";

// ============================================================
// AUTH
// ============================================================

// ============================== SIGN UP
export async function createUserAccount(user: INewUser) {
  try {
    const newAccount = await account.create(
      ID.unique(),
      user.email,
      user.password,
      user.name
    );

    if (!newAccount) throw Error;

    const avatarUrl = avatars.getInitials(user.name);

    const newUser = await saveUserToDB({
      accountId: newAccount.$id,
      name: newAccount.name,
      email: newAccount.email,
      username: user.username,
      imageUrl: avatarUrl,
    });

    return newUser;
  } catch (error) {
    console.log(error);
    return error;
  }
}

// ============================== SAVE USER TO DB
export async function saveUserToDB(user: {
  accountId: string;
  email: string;
  name: string;
  imageUrl: URL;
  username?: string;
}) {
  try {
    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      user
    );

    return newUser;
  } catch (error) {
    console.log(error);
  }
}

// ============================== SIGN IN
export async function signInAccount(user: { email: string; password: string }) {
  try {
    const session = await account.createEmailSession(user.email, user.password);

    return session;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET ACCOUNT
export async function getAccount() {
  try {
    const currentAccount = await account.get();

    return currentAccount;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET USER
export async function getCurrentUser() {
  try {
    const currentAccount = await getAccount();

    if (!currentAccount) throw Error;

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );

    if (!currentUser) throw Error;

    return currentUser.documents[0];
  } catch (error) {
    console.log(error);
    return null;
  }
}

// ============================== SIGN OUT
export async function signOutAccount() {
  try {
    const session = await account.deleteSession("current");

    return session;
  } catch (error) {
    console.log(error);
  }
}

// ============================================================
// POSTS
// ============================================================

// ============================== CREATE POST
export async function createPost(post: INewPost) {
  try {
    // Upload multiple files to appwrite storage
    const uploadedFiles = await Promise.all(
      post.file.map(file => uploadFile(file))
    );

    if (!uploadedFiles.length) throw Error;

    // Get file urls
    const fileUrls = uploadedFiles.filter(f => f).map(file => getFilePreview(file!.$id));
    const fileIds = uploadedFiles.filter(f => f).map(file => file!.$id);

    // Remove any failed uploads
    const validUrls: any[] = [];
    const validIds: any[] = [];
    
    fileUrls.forEach((url, idx) => {
      if (url) {
        validUrls.push(url);
        validIds.push(fileIds[idx]);
      }
    });

    if (!validUrls.length) {
      // Delete uploaded files if no valid URLs
      await Promise.all(fileIds.map(id => deleteFile(id)));
      throw Error;
    }

    // Convert tags into array
    const tags = post.tags?.replace(/ /g, "").split(",") || [];

    // Create post
    const newPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      ID.unique(),
      {
        creator: [post.userId],
        caption: post.caption,
        imageUrls: validUrls,
        imageIds: validIds,
        tags: tags,
        isActive: true,
        postedAt: new Date().toISOString(),
        likes: [],
      }
    );

    if (!newPost) {
      // Delete uploaded files if post creation failed
      await Promise.all(validIds.map(id => deleteFile(id)));
      throw Error;
    }

    return newPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UPLOAD FILE
export async function uploadFile(file: File) {
  try {
    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      file
    );

    return uploadedFile;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET FILE URL
export function getFilePreview(fileId: string) {
  try {
    const fileUrl = storage.getFilePreview(
      appwriteConfig.storageId,
      fileId,
      2000,
      2000,
      "top",
      100
    );

    if (!fileUrl) throw Error;

    return fileUrl;
  } catch (error) {
    console.log(error);
  }
}

// ============================== DELETE FILE
export async function deleteFile(fileId: string) {
  try {
    await storage.deleteFile(appwriteConfig.storageId, fileId);

    return { status: "ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET POSTS
export async function searchPosts(searchTerm: string) {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.search("caption", searchTerm)]
    );

    if (!posts) throw Error;

    // Populate creator information for each post
    const postsWithCreators = await Promise.all(
      posts.documents.map(async (post) => {
        try {
          // Check if creator is already an object (populated) or just a string ID
          if (typeof post.creator === 'object' && post.creator?.$id && post.creator.name) {
            return post; // Already populated with full user data
          }
          const creatorId = getCreatorId(post.creator);
          if (!creatorId) {
            return post;
          }
          const creator = await getUserById(creatorId);
          return {
            ...post,
            creator: creator,
          };
        } catch (error) {
          return post;
        }
      })
    );

    return {
      ...posts,
      documents: postsWithCreators,
    };
  } catch (error) {
    console.log(error);
  }
}

export async function getInfinitePosts({ pageParam }: { pageParam: number }) {
  const queries: any[] = [Query.orderDesc("$updatedAt"), Query.limit(9)];

  if (pageParam) {
    queries.push(Query.cursorAfter(pageParam.toString()));
  }

  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      queries
    );

    if (!posts) throw Error;

    // Populate creator information for each post
    const postsWithCreators = await Promise.all(
      posts.documents.map(async (post) => {
        try {
          // Check if creator is already an object (populated) or just a string ID
          if (typeof post.creator === 'object' && post.creator?.$id && post.creator.name) {
            return post; // Already populated with full user data
          }
          const creatorId = getCreatorId(post.creator);
          if (!creatorId) {
            return post;
          }
          const creator = await getUserById(creatorId);
          return {
            ...post,
            creator: creator,
          };
        } catch (error) {
          return post;
        }
      })
    );

    return {
      ...posts,
      documents: postsWithCreators,
    };
  } catch (error) {
    console.log(error);
  }
}

// ============================== HELPER: Get Creator ID
function getCreatorId(creator: any): string | null {
  if (typeof creator === 'string') {
    return creator;
  }
  if (Array.isArray(creator)) {
    return creator[0] || null;
  }
  if (typeof creator === 'object' && creator?.$id) {
    return creator.$id;
  }
  return null;
}

// ============================== GET POST BY ID
export async function getPostById(postId?: string) {
  if (!postId) throw Error;

  try {
    const post = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId
    );

    if (!post) throw Error;

    // Populate creator information
    try {
      // Check if creator is already an object (populated) or just a string ID
      if (typeof post.creator === 'object' && post.creator?.$id && post.creator.name) {
        return post; // Already populated with full user data
      }
      const creatorId = getCreatorId(post.creator);
      if (!creatorId) {
        return post;
      }
      const creator = await getUserById(creatorId);
      return {
        ...post,
        creator: creator,
      };
    } catch (error) {
      return post;
    }
  } catch (error) {
    console.log(error);
  }
}

// ============================== UPDATE POST
export async function updatePost(post: IUpdatePost) {
  const hasFileToUpdate = post.file.length > 0;

  try {
    let image = {
      imageUrl: post.imageUrl,
      imageId: post.imageId,
    };

    if (hasFileToUpdate) {
      // Upload new file to appwrite storage
      const uploadedFile = await uploadFile(post.file[0]);
      if (!uploadedFile) throw Error;

      // Get new file url
      const fileUrl = getFilePreview(uploadedFile.$id);
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }

      image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
    }

    // Convert tags into array
    const tags = post.tags?.replace(/ /g, "").split(",") || [];

    //  Update post
    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      post.postId,
      {
        caption: post.caption,
        imageUrl: image.imageUrl,
        imageId: image.imageId,
        location: post.location,
        tags: tags,
      }
    );

    // Failed to update
    if (!updatedPost) {
      // Delete new file that has been recently uploaded
      if (hasFileToUpdate) {
        await deleteFile(image.imageId);
      }

      // If no new file uploaded, just throw error
      throw Error;
    }

    // Safely delete old file after successful update
    if (hasFileToUpdate) {
      await deleteFile(post.imageId);
    }

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== DELETE POST
export async function deletePost(postId?: string, imageId?: string | string[]) {
  if (!postId) return;

  try {
    // Delete the post document
    const statusCode = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId
    );

    if (!statusCode) throw Error;

    // Delete all associated images
    if (imageId) {
      const imageIds = Array.isArray(imageId) ? imageId : [imageId];
      await Promise.all(
        imageIds.map(id => {
          if (id) {
            return deleteFile(id).catch(err => {
              console.log('Error deleting image:', err);
              return null;
            });
          }
          return null;
        })
      );
    }

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

// ============================== LIKE / UNLIKE POST
export async function likePost(postId: string, likesArray: string[]) {
  try {
    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
      {
        likes: likesArray,
      }
    );

    if (!updatedPost) throw Error;

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== SAVE POST
export async function savePost(userId: string, postId: string) {
  try {
    // Check if this post is already saved by this user
    const existingSaves = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      [Query.equal("user", userId), Query.equal("post", postId)]
    );

    // If already saved, don't create a duplicate
    if (existingSaves.documents.length > 0) {
      return existingSaves.documents[0];
    }

    const updatedPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      ID.unique(),
      {
        user: userId,
        post: postId,
      }
    );

    if (!updatedPost) throw Error;

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}
// ============================== GET SAVED POSTS
export async function getSavedPosts(userId: string) {
  try {
    // Get all saves for the user
    const saves = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      [Query.equal("user", userId), Query.orderDesc("$createdAt")]
    );

    if (!saves) throw Error;

    // Fetch full post data for each save with creator information
    const postsWithCreators = await Promise.all(
      saves.documents.map(async (saveRecord) => {
        try {
          // Get the post ID from the save record
          // saveRecord.post could be a string ID or an object with $id
          let postId = saveRecord.post;
          
          if (typeof postId === 'object' && postId?.$id) {
            postId = postId.$id;
          } else if (Array.isArray(postId)) {
            postId = postId[0];
          }
          
          if (!postId || typeof postId !== 'string') {
            console.log("Invalid postId:", saveRecord.post);
            return null;
          }

          // Fetch the full post
          const post = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId
          );

          if (!post) return null;

          // Get creator information
          let creatorData = null;
          if (post.creator) {
            const creatorId = getCreatorId(post.creator);
            if (creatorId) {
              creatorData = await getUserById(creatorId);
            }
          }

          return {
            ...post,
            creator: creatorData,
            saveId: saveRecord.$id, // Include save record ID for deletion
          };
        } catch (error) {
          console.log("Error fetching saved post:", error);
          return null;
        }
      })
    );

    // Filter out null entries and deduplicate by post $id
    const validPosts = postsWithCreators.filter(Boolean);
    
    // Create a map to track unique posts by their $id, keeping the most recent save
    const uniquePostsMap = new Map();
    validPosts.forEach((post: any) => {
      if (post && post.$id) {
        // Only keep the first (most recent) save of each post
        if (!uniquePostsMap.has(post.$id)) {
          uniquePostsMap.set(post.$id, post);
        }
      }
    });

    const deduplicatedPosts = Array.from(uniquePostsMap.values());

    return {
      ...saves,
      documents: deduplicatedPosts,
    };
  } catch (error) {
    console.log(error);
  }
}

// ============================== DELETE SAVED POST
export async function deleteSavedPost(savedRecordId: string) {
  try {
    const statusCode = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      savedRecordId
    );

    if (!statusCode) throw Error;

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET USER'S POST
export async function getUserPosts(userId?: string) {
  if (!userId) return;

  try {
    const post = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.equal("creator", userId), Query.orderDesc("$createdAt")]
    );

    if (!post) throw Error;

    // Populate creator information for each post
    const postsWithCreators = await Promise.all(
      post.documents.map(async (doc) => {
        try {
          // Check if creator is already an object (populated) or just a string ID
          if (typeof doc.creator === 'object' && doc.creator?.$id && doc.creator.name) {
            return doc; // Already populated with full user data
          }
          const creatorId = getCreatorId(doc.creator);
          if (!creatorId) {
            return doc;
          }
          const creator = await getUserById(creatorId);
          return {
            ...doc,
            creator: creator,
          };
        } catch (error) {
          return doc;
        }
      })
    );

    return {
      ...post,
      documents: postsWithCreators,
    };
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET USER'S LIKED POSTS
export async function getUserLikedPosts(userId?: string) {
  if (!userId) return;

  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.orderDesc("$createdAt")]
    );

    if (!posts) throw Error;

    // Filter posts where userId is in the likes array
    const likedPosts = posts.documents.filter((post: any) => 
      post.likes && post.likes.includes(userId)
    );

    // Populate creator information for each post
    const postsWithCreators = await Promise.all(
      likedPosts.map(async (doc) => {
        try {
          // Check if creator is already an object (populated) or just a string ID
          if (typeof doc.creator === 'object' && doc.creator?.$id && doc.creator.name) {
            return doc; // Already populated with full user data
          }
          const creatorId = getCreatorId(doc.creator);
          if (!creatorId) {
            return doc;
          }
          const creator = await getUserById(creatorId);
          return {
            ...doc,
            creator: creator,
          };
        } catch (error) {
          return doc;
        }
      })
    );

    return { ...posts, documents: postsWithCreators };
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET POPULAR POSTS (BY HIGHEST LIKE COUNT)
export async function getRecentPosts() {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.orderDesc("$createdAt"), Query.limit(20)]
    );

    if (!posts) throw Error;

    // Populate creator information for each post
    const postsWithCreators = await Promise.all(
      posts.documents.map(async (post) => {
        try {
          // Check if creator is already an object (populated) or just a string ID
          if (typeof post.creator === 'object' && post.creator?.$id && post.creator.name) {
            return post; // Already populated with full user data
          }
          const creatorId = getCreatorId(post.creator);
          if (!creatorId) {
            return post;
          }
          const creator = await getUserById(creatorId);
          return {
            ...post,
            creator: creator,
          };
        } catch (error) {
          return post;
        }
      })
    );

    return {
      ...posts,
      documents: postsWithCreators,
    };
  } catch (error) {
    console.log(error);
  }
}

// ============================================================
// USER
// ============================================================

// ============================== GET USERS
export async function getUsers(limit?: number) {
  const queries: any[] = [Query.orderDesc("$createdAt")];

  if (limit) {
    queries.push(Query.limit(limit));
  }

  try {
    const users = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      queries
    );

    if (!users) throw Error;

    return users;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET USER BY ID
export async function getUserById(userId: string | any) {
  try {
    // Handle case where userId is already a user object
    if (typeof userId === 'object' && userId?.$id) {
      return userId;
    }
    
    // Handle case where userId is an array (e.g., [userId])
    let actualUserId = userId;
    if (Array.isArray(userId)) {
      actualUserId = userId[0];
    }
    
    // Validate that we have a valid string ID
    if (typeof actualUserId !== 'string' || !actualUserId) {
      console.error('Invalid userId:', userId);
      return null;
    }
    
    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      actualUserId
    );

    if (!user) throw Error;

    return user;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UPDATE USER
export async function updateUser(user: IUpdateUser) {
  const hasFileToUpdate = user.file.length > 0;
  try {
    let image = {
      imageUrl: user.imageUrl,
      imageId: user.imageId,
    };

    if (hasFileToUpdate) {
      // Upload new file to appwrite storage
      const uploadedFile = await uploadFile(user.file[0]);
      if (!uploadedFile) throw Error;

      // Get new file url
      const fileUrl = getFilePreview(uploadedFile.$id);
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }

      image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
    }

    //  Update user
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      user.userId,
      {
        name: user.name,
        bio: user.bio,
        imageUrl: image.imageUrl,
        imageId: image.imageId,
      }
    );

    // Failed to update
    if (!updatedUser) {
      // Delete new file that has been recently uploaded
      if (hasFileToUpdate) {
        await deleteFile(image.imageId);
      }
      // If no new file uploaded, just throw error
      throw Error;
    }

    // Safely delete old file after successful update
    if (user.imageId && hasFileToUpdate) {
      await deleteFile(user.imageId);
    }

    return updatedUser;
  } catch (error) {
    console.log(error);
  }
}

// ============================== FOLLOW USER
export async function followUser(currentUserId: string, userToFollowId: string) {
  try {
    // Get current user
    const currentUser = await getUserById(currentUserId);
    if (!currentUser) throw Error;

    // Get user to follow
    const userToFollow = await getUserById(userToFollowId);
    if (!userToFollow) throw Error;

    // Helper function to parse followers/following
    const parseList = (data: any) => {
      if (Array.isArray(data)) return data;
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch {
          return [];
        }
      }
      return [];
    };

    // Update current user's following list
    const currentFollowing = parseList(currentUser.following);
    if (!currentFollowing.includes(userToFollowId)) {
      currentFollowing.push(userToFollowId);
    }

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      currentUserId,
      {
        following: currentFollowing,
      }
    );

    // Update user to follow's followers list
    const userFollowers = parseList(userToFollow.followers);
    if (!userFollowers.includes(currentUserId)) {
      userFollowers.push(currentUserId);
    }

    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userToFollowId,
      {
        followers: userFollowers,
      }
    );

    return updatedUser;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UNFOLLOW USER
export async function unfollowUser(currentUserId: string, userToUnfollowId: string) {
  try {
    // Get current user
    const currentUser = await getUserById(currentUserId);
    if (!currentUser) throw Error;

    // Get user to unfollow
    const userToUnfollow = await getUserById(userToUnfollowId);
    if (!userToUnfollow) throw Error;

    // Helper function to parse followers/following
    const parseList = (data: any) => {
      if (Array.isArray(data)) return data;
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch {
          return [];
        }
      }
      return [];
    };

    // Update current user's following list
    const currentFollowing = parseList(currentUser.following);
    const updatedFollowing = currentFollowing.filter((id: string) => id !== userToUnfollowId);

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      currentUserId,
      {
        following: updatedFollowing,
      }
    );

    // Update user to unfollow's followers list
    const userFollowers = parseList(userToUnfollow.followers);
    const updatedFollowers = userFollowers.filter((id: string) => id !== currentUserId);

    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userToUnfollowId,
      {
        followers: updatedFollowers,
      }
    );

    return updatedUser;
  } catch (error) {
    console.log(error);
  }
}

// ============================================================
// COMMENTS
// ============================================================

// ============================== CREATE COMMENT
export async function createComment(userId: string, postId: string, commentText: string) {
  try {
    const newComment = await databases.createDocument(
      appwriteConfig.databaseId,
      "comments",
      ID.unique(),
      {
        commentText: commentText,
        userId: userId,
        postId: postId,
      }
    );

    if (!newComment) throw Error;

    return newComment;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET POST COMMENTS
export async function getPostComments(postId: string) {
  try {
    const comments = await databases.listDocuments(
      appwriteConfig.databaseId,
      "comments",
      [Query.equal("postId", postId), Query.orderDesc("$createdAt")]
    );

    if (!comments) throw Error;

    // Fetch user data for each comment
    const commentsWithUsers = await Promise.all(
      comments.documents.map(async (comment) => {
        try {
          const user = await getUserById(comment.userId);
          return {
            ...comment,
            creator: user,
          };
        } catch (error) {
          return comment;
        }
      })
    );

    return {
      ...comments,
      documents: commentsWithUsers,
    };
  } catch (error) {
    console.log(error);
  }
}

// ============================== DELETE COMMENT
export async function deleteComment(commentId: string) {
  try {
    const statusCode = await databases.deleteDocument(
      appwriteConfig.databaseId,
      "comments",
      commentId
    );

    if (!statusCode) throw Error;

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
  }
}
