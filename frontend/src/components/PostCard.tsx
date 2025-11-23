import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageSquare } from 'lucide-react';

interface Post {
    _id: string;
    content: string;
    imageUrl?: string;
    likes: string[];
    createdAt: string;
    commentCount: number;
    user?: {
        name: string;
        university: string;
    };
}

export default function PostCard({ post, onLike }: { post: Post; onLike: (id: string) => void }) {
    return (
        <div className="mb-4 rounded-lg bg-white p-4 shadow">
            <Link href={`/posts/${post._id}`}>
                <h3 className="mb-2 text-lg font-bold text-gray-900">{post.user?.name || 'Unknown User'}<span className="text-sm text-gray-500 ml-2">{post.user?.university || 'Unknown University'}</span></h3>

                <p className="mb-2 text-gray-800">{post.content}</p>
            </Link>
            {post.imageUrl && (
                <img src={post.imageUrl} alt="Post" className="mb-2 h-auto w-full rounded" />
            )}
            <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{formatDistanceToNow(new Date(post.createdAt))} ago</span>
                <div className="flex space-x-4">
                    <button onClick={() => onLike(post._id)} className="flex items-center space-x-1 hover:text-red-500">
                        <Heart size={16} />
                        <span>{post.likes.length}</span>
                    </button>
                    <Link href={`/posts/${post._id}`} className="flex items-center space-x-1 hover:text-blue-500">
                        <MessageSquare size={16} />
                        <span>{post.commentCount || 0}</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
