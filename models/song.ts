// models/song.ts
import mongoose from 'mongoose'

const songSchema = new mongoose.Schema({
  userId: mongoose.Types.ObjectId,
  title: String,
  artist: String,
  url: String,
  tags: [String],
  isFavorite: Boolean,
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.models.Song || mongoose.model('Song', songSchema)
