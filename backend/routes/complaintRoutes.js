const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { protect, authorize } = require('../middleware/auth');

// ===== Helper: check if a complaint is overdue and mark it escalated =====
// Called whenever complaints are fetched (real-time check, no background job)
function applyEscalationCheck(complaint) {
  const isOverdue = complaint.deadlineAt && new Date(complaint.deadlineAt) < new Date();
  const stillOpen = complaint.status === 'pending' || complaint.status === 'in-progress';
  if (isOverdue && stillOpen) {
    complaint.status = 'escalated';
  }
  return complaint;
}

// ===== CREATE COMPLAINT =====
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, photo, location } = req.body;

    if (!title || !description || !location || !location.ward) {
      return res.status(400).json({
        message: 'title, description, and location.ward are required'
      });
    }

    const complaint = await Complaint.create({
      title,
      description,
      photo: photo || null,
      location: {
        ward: location.ward,
        lat: location.lat || null,
        lng: location.lng || null,
        landmark: location.landmark || null
      },
      submittedBy: req.user.id
    });

    res.status(201).json({ message: 'Complaint submitted successfully', complaint });
  } catch (err) {
    console.error(err); // TEMP: full error for debugging
    res.status(500).json({ message: 'Failed to submit complaint', error: err.message });
  }
});

// ===== GET COMPLAINTS (role-based visibility) =====
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'citizen') {
      filter.submittedBy = req.user.id;
    } else if (req.user.role === 'ward_official') {
      filter['location.ward'] = req.user.ward;
    } else if (req.user.role === 'metro_admin' && req.query.ward) {
      // Optional ward filter — only metro_admin can use it, since
      // ward_official is already locked to their own ward above.
      filter['location.ward'] = Number(req.query.ward);
    }

    // Optional status filter — safe for any role, since it only narrows
    // down complaints the user could already see, never expands access.
    const validStatuses = ['pending', 'in-progress', 'resolved', 'escalated'];
    if (req.query.status && validStatuses.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    let complaints = await Complaint.find(filter).sort({ createdAt: -1 });

    complaints = await Promise.all(complaints.map(async (c) => {
      const before = c.status;
      applyEscalationCheck(c);
      if (c.status !== before) await c.save();
      return c;
    }));

    res.status(200).json({ count: complaints.length, complaints });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch complaints', error: err.message });
  }
});

// ===== GET SINGLE COMPLAINT =====
router.get('/:id', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (req.user.role === 'citizen' && String(complaint.submittedBy) !== req.user.id) {
      return res.status(403).json({ message: 'You do not have access to this complaint' });
    }
    if (req.user.role === 'ward_official' && complaint.location.ward !== req.user.ward) {
      return res.status(403).json({ message: 'You do not have access to this complaint' });
    }

    const before = complaint.status;
    applyEscalationCheck(complaint);
    if (complaint.status !== before) await complaint.save();

    res.status(200).json({ complaint });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch complaint', error: err.message });
  }
});

// ===== UPDATE COMPLAINT STATUS =====
router.put('/:id/status', protect, authorize('ward_official', 'metro_admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'in-progress', 'resolved', 'escalated'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (req.user.role === 'ward_official' && complaint.location.ward !== req.user.ward) {
      return res.status(403).json({ message: 'You can only update complaints in your own ward' });
    }

    complaint.status = status;
    await complaint.save();

    res.status(200).json({ message: 'Complaint status updated', complaint });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update complaint status', error: err.message });
  }
});

module.exports = router;