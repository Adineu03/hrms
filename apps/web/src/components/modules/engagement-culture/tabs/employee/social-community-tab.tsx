'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Users,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  ThumbsUp,
  Star,
} from 'lucide-react';

interface Post {
  id: string;
  authorName: string;
  content: string;
  type: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  isMember: boolean;
}

export default function SocialCommunityTab() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState('general');
  const [saving, setSaving] = useState(false);

  const [showShoutoutModal, setShowShoutoutModal] = useState(false);
  const [shoutoutTo, setShoutoutTo] = useState('');
  const [shoutoutMessage, setShoutoutMessage] = useState('');
  const [shoutoutValue, setShoutoutValue] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [feedRes, groupsRes] = await Promise.all([
        api.get('/engagement-culture/employee/social/feed'),
        api.get('/engagement-culture/employee/social/groups'),
      ]);

      const feedData = Array.isArray(feedRes.data) ? feedRes.data : feedRes.data?.data || [];
      const groupsData = Array.isArray(groupsRes.data) ? groupsRes.data : groupsRes.data?.data || [];

      setPosts(feedData);
      setGroups(groupsData);
    } catch {
      setError('Failed to load social feed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePost = async () => {
    if (!postContent.trim()) return;
    try {
      setSaving(true);
      setError('');
      await api.post('/engagement-culture/employee/social/posts', {
        content: postContent.trim(),
        type: postType,
      });
      setSuccess('Post created successfully.');
      setShowPostModal(false);
      setPostContent('');
      setPostType('general');
      loadData();
    } catch {
      setError('Failed to create post.');
    } finally {
      setSaving(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await api.post(`/engagement-culture/employee/social/posts/${postId}/like`);
      loadData();
    } catch {
      setError('Failed to like post.');
    }
  };

  const handleJoinLeaveGroup = async (groupId: string, isMember: boolean) => {
    try {
      setError('');
      if (isMember) {
        await api.post(`/engagement-culture/employee/social/groups/${groupId}/leave`);
        setSuccess('Left the group.');
      } else {
        await api.post(`/engagement-culture/employee/social/groups/${groupId}/join`);
        setSuccess('Joined the group.');
      }
      loadData();
    } catch {
      setError('Failed to update group membership.');
    }
  };

  const handleShoutout = async () => {
    if (!shoutoutTo.trim() || !shoutoutMessage.trim()) return;
    try {
      setSaving(true);
      setError('');
      await api.post('/engagement-culture/employee/social/posts', {
        content: shoutoutMessage.trim(),
        type: 'shoutout',
        mentionedUser: shoutoutTo.trim(),
        cultureValue: shoutoutValue.trim(),
      });
      setSuccess('Shoutout posted successfully!');
      setShowShoutoutModal(false);
      setShoutoutTo('');
      setShoutoutMessage('');
      setShoutoutValue('');
      loadData();
    } catch {
      setError('Failed to post shoutout.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Social &amp; Community</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShoutoutModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
          >
            <Star className="h-4 w-4" />
            Shoutout
          </button>
          <button
            onClick={() => setShowPostModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Post
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Social Feed */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Feed</h3>
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="bg-background rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                        {post.authorName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-text">{post.authorName}</span>
                        {post.type !== 'general' && (
                          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            post.type === 'shoutout' ? 'bg-yellow-100 text-yellow-700' : post.type === 'achievement' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {post.type}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-text-muted">
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="text-sm text-text mb-3">{post.content}</p>
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                      post.isLiked ? 'text-primary' : 'text-text-muted hover:text-primary'
                    }`}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {post.likesCount || 0}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Groups Sidebar */}
        <div>
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Groups</h3>
          {groups.length === 0 ? (
            <div className="text-center py-8">
              <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
              <p className="text-text-muted text-sm">No groups available.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.id} className="bg-background rounded-xl border border-border p-4">
                  <h4 className="text-sm font-medium text-text mb-1">{group.name}</h4>
                  <p className="text-xs text-text-muted mb-2">{group.description || 'No description.'}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">{group.membersCount || 0} members</span>
                    <button
                      onClick={() => handleJoinLeaveGroup(group.id, group.isMember)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        group.isMember
                          ? 'text-red-600 border border-red-300 hover:bg-red-50'
                          : 'text-primary border border-primary hover:bg-primary hover:text-white'
                      }`}
                    >
                      {group.isMember ? 'Leave' : 'Join'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Create Post</h3>
              <button onClick={() => setShowPostModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Type</label>
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                >
                  <option value="general">General</option>
                  <option value="achievement">Achievement</option>
                  <option value="discussion">Discussion</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Content</label>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Share something with your colleagues..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowPostModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleCreatePost} disabled={saving || !postContent.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shoutout Modal */}
      {showShoutoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Give a Shoutout</h3>
              <button onClick={() => setShowShoutoutModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">To (Name or ID)</label>
                <input
                  type="text"
                  value={shoutoutTo}
                  onChange={(e) => setShoutoutTo(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Enter colleague's name or ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Culture Value</label>
                <input
                  type="text"
                  value={shoutoutValue}
                  onChange={(e) => setShoutoutValue(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. Innovation, Teamwork"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Message</label>
                <textarea
                  value={shoutoutMessage}
                  onChange={(e) => setShoutoutMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Why are you giving this shoutout?"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowShoutoutModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleShoutout} disabled={saving || !shoutoutTo.trim() || !shoutoutMessage.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Shoutout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
