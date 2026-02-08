import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Image, Type, Loader2, X, Camera, Palette, 
  Smile, AtSign, Hash, MapPin, Music, Sparkles,
  Bold, Italic, AlignCenter, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadFile } from "@/lib/storage";
import { toast } from "sonner";

interface CreateStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const BACKGROUND_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'linear-gradient(135deg, #fc466b 0%, #3f5efb 100%)',
  '#1a1a2e',
  '#16213e',
  '#0f3460',
  '#e94560',
  '#000000',
];

const FONT_STYLES = [
  { name: 'Modern', className: 'font-sans' },
  { name: 'Classic', className: 'font-serif' },
  { name: 'Playful', className: 'font-mono' },
];

const STICKERS = ['🔥', '❤️', '😍', '🎉', '✨', '💯', '🙌', '👏', '💪', '🎵', '📍', '⭐'];

export function CreateStoryModal({ open, onOpenChange, onCreated }: CreateStoryModalProps) {
  const { user } = useAuth();
  const [storyType, setStoryType] = useState<'text' | 'media' | 'camera'>('text');
  const [content, setContent] = useState('');
  const [backgroundStyle, setBackgroundStyle] = useState(BACKGROUND_GRADIENTS[0]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState([24]);
  const [fontStyle, setFontStyle] = useState(FONT_STYLES[0]);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [showStickers, setShowStickers] = useState(false);
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [textOverlay, setTextOverlay] = useState('');
  const [showTextOverlay, setShowTextOverlay] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [storyDuration, setStoryDuration] = useState([15]); // Duration in seconds (15-25)
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setStoryType('media');
    }
  };

  const startCamera = async () => {
    try {
      // Explicitly request mobile camera constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false 
      });
      
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Mobile browsers require an explicit play call to show the stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Mobile video play failed:", e));
        };
      }
      setStoryType('camera');
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error('Could not access camera. Ensure you are on HTTPS and gave permission.');
    }
  };

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const addSticker = (sticker: string) => {
    setSelectedStickers(prev => [...prev, sticker]);
  };

  const handleClose = () => {
    stopCamera();
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setContent('');
    setMediaFile(null);
    setMediaPreview(null);
    setCapturedImage(null);
    setSelectedStickers([]);
    setTextOverlay('');
    setShowTextOverlay(false);
    setStoryType('text');
    setStoryDuration([15]);
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    if (storyType === 'text' && !content.trim()) {
      toast.error('Please enter some text for your story');
      return;
    }
    
    if (storyType === 'media' && !mediaFile) {
      toast.error('Please select an image or video');
      return;
    }

    if (storyType === 'camera' && !capturedImage) {
      toast.error('Please capture a photo');
      return;
    }

    setLoading(true);

    try {
      let mediaUrl = null;
      let mediaType = null;

      if (mediaFile) {
        const { url, error } = await uploadFile('stories', mediaFile, user.id);
        if (error) throw error;
        mediaUrl = url;
        mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
      } else if (capturedImage) {
        // Convert data URL to blob and upload
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        const { url, error } = await uploadFile('stories', file, user.id);
        if (error) throw error;
        mediaUrl = url;
        mediaType = 'image';
      }

      const { error } = await supabase.from('stories').insert({
        user_id: user.id,
        content: storyType === 'text' ? content : (textOverlay || null),
        media_url: mediaUrl,
        media_type: storyType === 'text' ? 'text' : mediaType,
        background_color: storyType === 'text' ? backgroundStyle : null,
        duration: storyDuration[0],
      });

      if (error) throw error;

      toast.success('Story created!');
      resetForm();
      onCreated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create story');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const content_modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 flex flex-col"
      style={{ zIndex: 99999 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <Button variant="ghost" size="icon" onClick={handleClose} className="text-white">
          <X className="h-6 w-6" />
        </Button>
        <h2 className="text-white font-semibold text-lg">Create Moment</h2>
        <Button 
          onClick={handleSubmit} 
          disabled={loading}
          className="bg-primary hover:bg-primary/90"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Share'}
        </Button>
      </div>

      {/* Type selector */}
      <div className="flex gap-2 p-4 border-b border-white/10">
        <Button
          variant={storyType === 'text' ? 'default' : 'outline'}
          onClick={() => { setStoryType('text'); stopCamera(); }}
          className="flex-1"
          size="sm"
        >
          <Type className="h-4 w-4 mr-2" />
          Text
        </Button>
        <Button
          variant={storyType === 'media' ? 'default' : 'outline'}
          onClick={() => { fileInputRef.current?.click(); stopCamera(); }}
          className="flex-1"
          size="sm"
        >
          <Image className="h-4 w-4 mr-2" />
          Gallery
        </Button>
        <Button
          variant={storyType === 'camera' ? 'default' : 'outline'}
          onClick={startCamera}
          className="flex-1"
          size="sm"
        >
          <Camera className="h-4 w-4 mr-2" />
          Camera
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Preview area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="relative w-full max-w-sm aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl">
          {storyType === 'text' ? (
            <motion.div
              className="w-full h-full flex flex-col items-center justify-center p-6"
              style={{ background: backgroundStyle }}
            >
              <div className={`w-full text-white ${fontStyle.className}`} style={{ fontSize: `${fontSize[0]}px`, textAlign }}>
                {content || 'Start typing...'}
              </div>
              {/* Stickers */}
              {selectedStickers.map((sticker, idx) => (
                <motion.div
                  key={idx}
                  drag
                  dragMomentum={false}
                  className="absolute text-4xl cursor-move"
                  style={{ top: `${30 + idx * 10}%`, left: `${20 + idx * 15}%` }}
                >
                  {sticker}
                </motion.div>
              ))}
            </motion.div>
          ) : storyType === 'camera' ? (
            <div className="w-full h-full bg-black flex items-center justify-center">
              {capturedImage ? (
                <div className="relative w-full h-full">
                  <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setCapturedImage(null); startCamera(); }}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retake
                  </Button>
                </div>
              ) : cameraStream ? (
                <div className="relative w-full h-full">
                <video
              ref={videoRef}
               autoPlay
              playsInline  // CRITICAL: Stops mobile from going to a black screen
                muted
    className="w-full h-full object-cover scale-x-[-1]"
          />
                  {/* Camera capture button - prominent and visible */}
                  <button
                    onClick={capturePhoto}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white shadow-2xl active:scale-95 transition-transform z-10"
                  >
                    <div className="w-14 h-14 rounded-full bg-white" />
                  </button>
                </div>
              ) : (
                <div className="text-white/50 flex flex-col items-center gap-2">
                  <Camera className="h-12 w-12" />
                  <span>Camera loading...</span>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          ) : (
            <div className="w-full h-full bg-black flex items-center justify-center">
              {mediaPreview ? (
                <div className="relative w-full h-full">
                  {mediaFile?.type.startsWith('video/') ? (
                    <video src={mediaPreview} className="w-full h-full object-contain" controls />
                  ) : (
                    <img src={mediaPreview} alt="Preview" className="w-full h-full object-contain" />
                  )}
                  {/* Text overlay on media */}
                  {showTextOverlay && (
                    <motion.div
                      drag
                      dragMomentum={false}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 px-4 py-2 rounded-lg cursor-move"
                    >
                      <p className="text-white text-xl font-bold text-center">{textOverlay || 'Add text...'}</p>
                    </motion.div>
                  )}
                  {/* Stickers on media */}
                  {selectedStickers.map((sticker, idx) => (
                    <motion.div
                      key={idx}
                      drag
                      dragMomentum={false}
                      className="absolute text-4xl cursor-move"
                      style={{ top: `${30 + idx * 10}%`, left: `${20 + idx * 15}%` }}
                    >
                      {sticker}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2 text-white/50">
                  <Image className="h-16 w-16" />
                  <span>Tap to select</span>
                </label>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tools */}
      <div className="p-4 border-t border-white/10 space-y-4 max-h-[40vh] overflow-y-auto">
        {/* Duration slider - always visible */}
        <div className="flex items-center gap-4">
          <span className="text-white/70 text-sm w-20">Duration</span>
          <Slider
            value={storyDuration}
            onValueChange={setStoryDuration}
            min={5}
            max={25}
            step={5}
            className="flex-1"
          />
          <span className="text-white text-sm w-10">{storyDuration[0]}s</span>
        </div>

        {storyType === 'text' && (
          <>
            {/* Text input */}
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[60px]"
              maxLength={280}
            />

            {/* Font size */}
            <div className="flex items-center gap-4">
              <span className="text-white/70 text-sm w-20">Size</span>
              <Slider
                value={fontSize}
                onValueChange={setFontSize}
                min={16}
                max={48}
                step={2}
                className="flex-1"
              />
            </div>

            {/* Text alignment */}
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-sm w-20">Align</span>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <Button
                    key={align}
                    variant={textAlign === align ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTextAlign(align)}
                    className="text-white"
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>

            {/* Background colors */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Background</Label>
              <div className="flex gap-2 flex-wrap">
                {BACKGROUND_GRADIENTS.map((bg, idx) => (
                  <button
                    key={idx}
                    onClick={() => setBackgroundStyle(bg)}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      backgroundStyle === bg ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : ''
                    }`}
                    style={{ background: bg }}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {(storyType === 'media' || storyType === 'camera') && mediaPreview && (
          <>
            {/* Add text overlay */}
            <div className="flex gap-2">
              <Button
                variant={showTextOverlay ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowTextOverlay(!showTextOverlay)}
                className="text-white"
              >
                <Type className="h-4 w-4 mr-2" />
                Add Text
              </Button>
              <Button
                variant={showStickers ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowStickers(!showStickers)}
                className="text-white"
              >
                <Smile className="h-4 w-4 mr-2" />
                Stickers
              </Button>
            </div>

            {showTextOverlay && (
              <Input
                value={textOverlay}
                onChange={(e) => setTextOverlay(e.target.value)}
                placeholder="Add text overlay..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            )}

            {showStickers && (
              <div className="flex gap-2 flex-wrap">
                {STICKERS.map((sticker) => (
                  <button
                    key={sticker}
                    onClick={() => addSticker(sticker)}
                    className="text-2xl p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {sticker}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {storyType === 'media' && !mediaPreview && (
          <Button
            variant="outline"
            className="w-full text-white border-white/20"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="h-4 w-4 mr-2" />
            Select from Gallery
          </Button>
        )}
      </div>
    </motion.div>
  );

  return createPortal(content_modal, document.body);
}