import { useState, useRef, ReactNode } from "react";
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  AlertDialogCancel
} from "@/components/ui/alert-dialog";
import { ZoomIn, ZoomOut, X, Move } from "lucide-react";
import { motion, PanInfo, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

interface ZoomImageProps {
  src: string;
  alt: string;
  children?: ReactNode;
  className?: string;
  containerClassName?: string;
}

export function ZoomImage({ src, alt, children, className, containerClassName }: ZoomImageProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const imageRef = useRef<HTMLImageElement>(null);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 1));
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handlePan = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    x.set(x.get() + info.delta.x);
    y.set(y.get() + info.delta.y);
  };

  const handleReset = () => {
    x.set(0);
    y.set(0);
    setZoomLevel(1);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <div className={cn("relative cursor-zoom-in group", containerClassName)}>
          <img
            src={src}
            alt={alt}
            className={cn("w-full h-auto object-contain", className)}
          />
          {children}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="bg-white p-1 rounded-full shadow text-gray-700 hover:text-primary"
              onClick={() => setIsZoomed(true)}
            >
              <ZoomIn className="h-5 w-5" />
            </button>
          </div>
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-screen-lg w-[95vw] h-[90vh] p-0 overflow-hidden bg-gray-900">
        <div className="relative h-full">
          <div className="absolute top-2 right-2 z-10 flex space-x-2">
            <button
              className="bg-black/30 hover:bg-black/50 p-2 rounded-full text-white transition-colors"
              onClick={handleZoomIn}
              title="Zoom In"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              className="bg-black/30 hover:bg-black/50 p-2 rounded-full text-white transition-colors"
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <button
              className="bg-black/30 hover:bg-black/50 p-2 rounded-full text-white transition-colors"
              onClick={handleReset}
              title="Reset View"
            >
              <Move className="h-5 w-5" />
            </button>
            <AlertDialogCancel className="bg-black/30 hover:bg-black/50 p-2 rounded-full text-white transition-colors">
              <X className="h-5 w-5" />
            </AlertDialogCancel>
          </div>
          
          <div className="h-full w-full flex items-center justify-center overflow-hidden">
            <motion.div
              drag
              dragMomentum={false}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onPan={handlePan}
              style={{ x, y }}
              className="cursor-move"
            >
              <motion.img
                ref={imageRef}
                src={src}
                alt={alt}
                className="max-h-[85vh] object-contain"
                style={{ scale: zoomLevel }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              {/* Don't render children during zoom to avoid scaling issues with annotations */}
              {zoomLevel === 1 && !isDragging && children}
            </motion.div>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
