import React, { useState, useEffect } from 'react';
import { Image, Link as LinkIcon, Smile, Send, MoreHorizontal, Heart, MessageCircle, Share2, Loader, MessageSquare, Edit3, Trash2, Save } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/ui/Modal';
import { toast } from '../store/toastStore';
import { useTranslation } from 'react-i18next';

interface ProfileData {
  username: string;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: ProfileData;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  likes: number;
  comments_count: number;
  liked_by: string[];
  profiles: ProfileData;
  comments?: Comment[];
}

const CommunityPage: React.FC = () => {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const { user } = useAuthStore();
  
  // Comment states
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [visibleComments, setVisibleComments] = useState<Record<string, boolean>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  // Delete Post Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // Edit Post states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [isUpdatingPost, setIsUpdatingPost] = useState(false);
  
  useEffect(() => {
    if (user) {
      const fetchCurrentUserAvatar = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        if (!error && data) {
          setCurrentAvatarUrl(data.avatar_url);
        }
      };
      fetchCurrentUserAvatar();
    }
  }, [user]);
  
  useEffect(() => {
    fetchPosts();
  }, []);
  
  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          comments_count,
          profiles (
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      // Initialize posts with an empty comments array
      const postsWithEmptyComments = (data || []).map(post => ({ ...post, comments: [] as Comment[] }));
      setPosts(postsWithEmptyComments);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error(t('communityPage.toasts.loadPostsError'));
    } finally {
      setLoading(false);
    }
  };
  
  const handlePost = async () => {
    if (!newPost.trim() || !user) return;
    
    setSubmitting(true);
    try {
      const { data: newPostData, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: newPost.trim()
        })
        .select('*, comments_count, profiles(username, avatar_url)')
        .single();
      
      if (error) throw error;
      
      if (newPostData) {
        // Add new post to the beginning of the list with empty comments and correct profile
        setPosts(prevPosts => [{ ...newPostData, comments: [] as Comment[], comments_count: 0 }, ...prevPosts]);
      }
      setNewPost('');
      toast.success(t('communityPage.toasts.postSuccess'));
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(t('communityPage.toasts.postError'));
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleOpenDeleteModal = (postId: string) => {
    setDeletingPostId(postId);
    setIsDeleteModalOpen(true);
  };
  
  const handleConfirmDeletePost = async () => {
    if (!deletingPostId) return;
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', deletingPostId);
      if (error) throw error;
      setPosts(posts.filter(post => post.id !== deletingPostId));
      toast.success(t('communityPage.toasts.deleteSuccess'));
    } catch (err) {
      console.error('Error deleting post:', err);
      toast.error(t('communityPage.toasts.deleteError'));
    }
    setIsDeleteModalOpen(false);
    setDeletingPostId(null);
  };
  
  const handleStartEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setEditPostContent(post.content);
  };
  
  const handleCancelEditPost = () => {
    setEditingPostId(null);
    setEditPostContent('');
  };
  
  const handleSaveEditPost = async () => {
    if (!editingPostId || !editPostContent.trim()) return;
    setIsUpdatingPost(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .update({ content: editPostContent.trim() })
        .eq('id', editingPostId)
        .select('*, comments_count, profiles(username, avatar_url)')
        .single();

      if (error) throw error;

      if (data) {
        setPosts(posts.map(p => p.id === editingPostId ? { ...p, ...data, comments: p.comments } : p));
        toast.success(t('communityPage.toasts.updateSuccess'));
      }
      handleCancelEditPost();
    } catch (err) {
      console.error('Error updating post:', err);
      toast.error(t('communityPage.toasts.updateError'));
    } finally {
      setIsUpdatingPost(false);
    }
  };
  
  const handleLike = async (postId: string, currentLikes: number, likedBy: string[]) => {
    if (!user) return;
    
    const hasLiked = likedBy.includes(user.id);
    const newLikes = hasLiked ? currentLikes - 1 : currentLikes + 1;
    const newLikedBy = hasLiked 
      ? likedBy.filter(id => id !== user.id)
      : [...likedBy, user.id];
    
    // Optimistically update UI
    setPosts(posts.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            likes: newLikes,
            liked_by: newLikedBy
          }
        : post
    ));

    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          likes: newLikes,
          liked_by: newLikedBy
        })
        .eq('id', postId);
      
      if (error) {
        // Revert optimistic update on error
        setPosts(posts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                likes: currentLikes, // Revert to original likes
                liked_by: likedBy    // Revert to original liked_by
              }
            : post
        ));
        throw error;
      }
    } catch (error) {
      console.error('Error updating like:', error);
      toast.error(t('communityPage.toasts.likeError'));
    }
  };
  
  const fetchCommentsForPost = async (postId: string) => {
    if (visibleComments[postId] && posts.find(p => p.id === postId)?.comments?.length) {
      // Comments already loaded and visible, or already loaded for this post, toggle visibility
      setVisibleComments(prev => ({ ...prev, [postId]: !prev[postId] }));
      return;
    }
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setPosts(prevPosts => prevPosts.map(post => 
        post.id === postId ? { ...post, comments: data || [] } : post
      ));
      setVisibleComments(prev => ({ ...prev, [postId]: true }));
    } catch (err) {
      console.error('Error fetching comments:', err);
      toast.error(t('communityPage.toasts.loadCommentsError'));
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };
  
  const handleCommentInputChange = (postId: string, content: string) => {
    setCommentInputs(prev => ({ ...prev, [postId]: content }));
  };
  
  const handleCommentSubmit = async (postId: string) => {
    if (!commentInputs[postId]?.trim() || !user) return;
    setSubmittingComment(prev => ({...prev, [postId]: true}));
    try {
      const { data: newCommentData, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: commentInputs[postId].trim()
        })
        .select('*, profiles(username, avatar_url)')
        .single();

      if (error) throw error;

      if (newCommentData) {
        setPosts(prevPosts => prevPosts.map(post =>
          post.id === postId
            ? { 
                ...post, 
                comments: [...(post.comments || []), newCommentData],
                comments_count: (post.comments_count || 0) + 1 // DBトリガーで更新されるが、即時反映のため
              }
            : post
        ));
        setCommentInputs(prev => ({ ...prev, [postId]: '' })); // Clear input
        toast.success(t('communityPage.toasts.commentSuccess'));
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
      toast.error(t('communityPage.toasts.commentError'));
    } finally {
      setSubmittingComment(prev => ({...prev, [postId]: false}));
    }
  };
  
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString();
  };
  
  if (loading && posts.length === 0) { // Ensure initial load only shows global loader if no posts yet
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader className="h-8 w-8 text-cyan-500 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-950 py-10">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Create Post */}
          {user && (
            <Card className="bg-gray-900 border border-gray-800 mb-8">
              <div className="p-4">
                <div className="flex gap-4">
                  <img
                    src={
                      currentAvatarUrl ||
                      user?.user_metadata?.avatar_url ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`
                    }
                    alt="Your avatar"
                    className="w-12 h-12 rounded-lg object-cover border border-gray-700"
                  />
                  <div className="flex-1">
                    <textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder={user ? "What's on your mind?" : "Please sign in to post"}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-cyan-500/50"
                      rows={3}
                      disabled={!user}
                    />
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white hover:bg-gray-800"
                          disabled={!user}
                          title="Add image (coming soon)"
                        >
                          <Image className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white hover:bg-gray-800"
                          disabled={!user}
                          title="Add link (coming soon)"
                        >
                          <LinkIcon className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white hover:bg-gray-800"
                          disabled={!user}
                          title="Add emoji (coming soon)"
                        >
                          <Smile className="h-5 w-5" />
                        </Button>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handlePost}
                        disabled={!user || !newPost.trim() || submitting}
                        className="bg-gradient-to-r from-cyan-500 to-purple-500"
                        leftIcon={submitting ? <Loader className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                      >
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
          
          {/* Posts Feed */}
          <div className="space-y-6">
            {posts.map(post => (
              <Card 
                key={post.id}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="p-4">
                  {editingPostId === post.id ? (
                    // Edit Post Form
                    <div className="space-y-3">
                       <textarea
                        value={editPostContent}
                        onChange={(e) => setEditPostContent(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-cyan-500/50"
                        rows={4}
                      />
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEditPost}
                          disabled={isUpdatingPost}
                          className="text-gray-400 hover:text-white hover:bg-gray-700"
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="primary" 
                          size="sm" 
                          onClick={handleSaveEditPost} 
                          disabled={isUpdatingPost || !editPostContent.trim()}
                          leftIcon={isUpdatingPost ? <Loader className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4"/>}
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Normal Post Display
                    <>
                      <div className="flex justify-between items-start mb-4">
                        <RouterLink 
                          to={`/profile/${post.user_id}`}
                          className="flex gap-3 hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`}
                            alt={post.profiles?.username}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-700"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white hover:text-cyan-400 transition-colors">
                                {post.profiles?.username || 'Anonymous'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-400">
                              {formatTimestamp(post.created_at)}
                            </div>
                          </div>
                        </RouterLink>
                        {post.user_id === user?.id && (
                          <div className="relative group">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-white hover:bg-gray-800 p-1"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                            <div className="absolute right-0 mt-1 w-40 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-auto group-hover:pointer-events-auto">
                              <button 
                                onClick={() => handleStartEditPost(post)} 
                                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                              >
                                <Edit3 className="h-4 w-4" /> Edit Post
                              </button>
                              <button 
                                onClick={() => handleOpenDeleteModal(post.id)} 
                                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" /> Delete Post
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-white mb-4 whitespace-pre-wrap break-words">
                        {post.content}
                      </div>
                    </>
                  )}
                  
                  <div className="flex items-center gap-6 pt-3 border-t border-gray-700/50">
                    <button
                      onClick={() => handleLike(post.id, post.likes, post.liked_by)}
                      disabled={!user}
                      className={`flex items-center gap-2 text-sm ${
                        user && post.liked_by.includes(user.id)
                          ? 'text-red-500'
                          : 'text-gray-400 hover:text-red-500'
                      } disabled:opacity-50`}
                    >
                      <Heart className={`h-5 w-5 ${user && post.liked_by.includes(user.id) ? 'fill-current' : ''}`} />
                      {post.likes}
                    </button>
                    <button 
                      onClick={() => fetchCommentsForPost(post.id)}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 disabled:opacity-50"
                    >
                      <MessageSquare className="h-5 w-5" />
                      {post.comments_count} Comments
                      {loadingComments[post.id] && <Loader className="animate-spin h-4 w-4 ml-1" />}
                    </button>
                    <button 
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 disabled:opacity-50"
                      disabled={!user}
                      title="Share (coming soon)"
                    >
                      <Share2 className="h-5 w-5" />
                      Share
                    </button>
                  </div>

                  {/* Comments Section */} 
                  {visibleComments[post.id] && (
                    <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-4">
                      {/* Comment Input Form */}
                      {user && (
                        <div className="flex gap-3 items-start">
                          <img
                            src={currentAvatarUrl || user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                            alt="Your avatar for comment"
                            className="w-10 h-10 rounded-lg object-cover border border-gray-700"
                          />
                          <div className="flex-1">
                            <textarea 
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => handleCommentInputChange(post.id, e.target.value)}
                              placeholder="Write a comment..."
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white placeholder-gray-400 resize-none focus:outline-none focus:border-cyan-500/50"
                              rows={2}
                            />
                            <div className="mt-2 flex justify-end">
                              <Button 
                                variant="primary" 
                                size="sm" 
                                onClick={() => handleCommentSubmit(post.id)}
                                disabled={!commentInputs[post.id]?.trim() || submittingComment[post.id]}
                                leftIcon={submittingComment[post.id] ? <Loader className="animate-spin h-3 w-3" /> : <Send className="h-3 w-3"/>}
                              >
                                Post Comment
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* List of Comments */} 
                      {post.comments && post.comments.length > 0 ? (
                        post.comments.map(comment => (
                          <div key={comment.id} className="flex gap-3 items-start pl-2">
                            <RouterLink to={`/profile/${comment.user_id}`} className="flex-shrink-0">
                              <img
                                src={comment.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`}
                                alt={comment.profiles?.username}
                                className="w-10 h-10 rounded-lg object-cover border border-gray-700 hover:opacity-80 transition-opacity"
                              />
                            </RouterLink>
                            <div className="flex-1 bg-gray-800/50 p-3 rounded-lg">
                              <div className="flex items-baseline gap-2">
                                <RouterLink to={`/profile/${comment.user_id}`}>
                                  <span className="font-semibold text-sm text-cyan-400 hover:underline">
                                    {comment.profiles?.username || 'Anonymous'}
                                  </span>
                                </RouterLink>
                                <span className="text-xs text-gray-500">
                                  {formatTimestamp(comment.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap break-words">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 pl-2">No comments yet.</p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
            
            {posts.length === 0 && !loading && (
              <Card className="bg-gray-900 border border-gray-800 p-8 text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-medium text-gray-300 mb-2">No Posts Yet</h3>
                <p className="text-gray-400">Be the first to share something with the community!</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Delete Post Confirmation Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        title="Delete Post"
        size="sm"
      >
        <p className="mb-6">Are you sure you want to delete this post? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDeletePost}>
            Delete Post
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default CommunityPage;