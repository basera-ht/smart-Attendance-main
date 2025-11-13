import express from 'express';
import { body, validationResult } from 'express-validator';
import Task from '../models/Task.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/tasks
// @desc    Get all tasks for the authenticated employee
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, priority } = req.query;
    const query = { employee: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
    if (priority) {
      query.priority = priority;
    }

    const tasks = await Task.find(query)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tasks'
    });
  }
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', authenticate, [
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('description').optional().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('dueDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, description, priority, dueDate, tags } = req.body;

    const task = await Task.create({
      employee: req.user._id,
      title,
      description,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      tags: tags || []
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating task'
    });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
router.put('/:id', authenticate, [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['pending', 'in-progress', 'completed', 'cancelled']),
  body('dueDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      employee: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const { title, description, priority, status, dueDate, tags } = req.body;

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = new Date(dueDate);
    if (tags) task.tags = tags;

    // Handle status change
    if (status) {
      task.status = status;
      if (status === 'completed' && !task.completedAt) {
        task.completedAt = new Date();
      } else if (status !== 'completed') {
        task.completedAt = undefined;
      }
    }

    await task.save();

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating task'
    });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      employee: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting task'
    });
  }
});

export default router;

