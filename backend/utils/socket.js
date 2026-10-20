const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication required for socket connection'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id, { attributes: ['_id', 'name', 'role', 'university'] });
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id;
    // Join the authenticated user's private notification room
    const userRoom = `user:${userId}`;
    socket.join(userRoom);
    console.log(`[Socket] User ${socket.user.name} (${userId}) connected and joined ${userRoom}`);

    // Join post rooms (supports single post or array of post IDs)
    socket.on('join_posts', (postIds) => {
      const ids = Array.isArray(postIds) ? postIds : [postIds];
      ids.forEach((id) => {
        if (id && typeof id === 'string') {
          const room = `post:${id}`;
          socket.join(room);
        }
      });
    });

    // Leave post rooms (e.g. when unmounting or changing views)
    socket.on('leave_posts', (postIds) => {
      const ids = Array.isArray(postIds) ? postIds : [postIds];
      ids.forEach((id) => {
        if (id && typeof id === 'string') {
          const room = `post:${id}`;
          socket.leave(room);
        }
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User ${socket.user.name} (${userId}) disconnected`);
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

// Send real-time notification to a specific user's room
const sendNotificationToUser = (userId, notificationData) => {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notificationData);
  }
};

// Broadcast post likes update to post room
const emitPostLikesUpdate = (postId, likes) => {
  if (io) {
    io.to(`post:${postId}`).emit('post_likes_updated', {
      postId,
      likes,
      likesCount: Array.isArray(likes) ? likes.length : 0,
    });
  }
};

// Broadcast new comment to post room
const emitPostCommentAdded = (postId, comment, commentCount) => {
  if (io) {
    io.to(`post:${postId}`).emit('post_comment_added', {
      postId,
      comment,
      commentCount,
    });
  }
};

module.exports = {
  initSocket,
  getIO,
  sendNotificationToUser,
  emitPostLikesUpdate,
  emitPostCommentAdded,
};
