'use client';
import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { CommentInput } from './CommentInput';
import { addComment } from '@/lib/communityService';
import { useAuthStore } from '@/stores/auth-store';
import { Comment } from './Comment';
import { Loader2 } from 'lucide-react';

interface CommentData {
  id: string;
  postId: string;
  parentCommentId: string | null;
  userId: string;
  content: string;
  createdAt: any;
  children?: CommentData[];
}

export function CommentThread({ postId }: { postId: string }) {
  const { user } = useAuthStore();
  const { data: comments, loading } = useCollection<CommentData>(`posts/${postId}/comments`, {
    orderBy: ['createdAt', 'asc'],
  });
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const commentTree = useMemo(() => {
    if (!comments) return [];
    const commentMap = new Map(comments.map(c => [c.id, { ...c, children: [] as CommentData[] }]));
    const roots: CommentData[] = [];
    comments.forEach(comment => {
      if (comment.parentCommentId && commentMap.has(comment.parentCommentId)) {
        commentMap.get(comment.parentCommentId)!.children.push(commentMap.get(comment.id)!);
      } else {
        roots.push(commentMap.get(comment.id)!);
      }
    });
    return roots;
  }, [comments]);

  const handlePostComment = async (content: string, parentId: string | null = null) => {
    if (!user) return;
    await addComment(postId, user.uid, content, parentId);
    if (parentId) {
      setReplyTo(null);
    }
  };

  const renderComments = (commentsToRender: CommentData[], level = 0) => {
    return commentsToRender.map(comment => (
      <div key={comment.id} className={level > 0 ? 'ml-4 sm:ml-8' : ''}>
        <Comment
          comment={comment}
          onReply={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
        />
        {replyTo === comment.id && (
          <div className="mt-2 ml-4 sm:ml-10">
            <CommentInput
              onSubmit={(content) => handlePostComment(content, comment.id)}
              placeholder={`Replying to...`}
              isReply={true}
            />
          </div>
        )}
        {comment.children && comment.children.length > 0 && (
          <div className="mt-2 space-y-3">
            {renderComments(comment.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };
  
  if (loading) {
    return <div className="flex items-center justify-center p-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      <CommentInput onSubmit={handlePostComment} placeholder="Write a comment..." />
      <div className="space-y-3">
        {renderComments(commentTree)}
      </div>
    </div>
  );
}
