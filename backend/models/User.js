import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, index: true },
  email: { type: String, unique: true, sparse: true, lowercase: true },
  mobile: { type: String, unique: true, sparse: true },
  password: { type: String, required: true, select: false },
  profileImage: { type: String, default: '' },
  about: { type: String, default: 'Hey there! I am using Vchat.' }, // WhatsApp-like bio
  status: { type: String, enum: ['Online', 'Busy', 'Away', 'Invisible'], default: 'Online' },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

// Methods & Hooks (keep existing hash logic)

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
// ... 

