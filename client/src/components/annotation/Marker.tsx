import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MarkerProps {
  x: number;
  y: number;
  id: number;
  isActive?: boolean;
  isNumbered?: boolean;
  onClick?: () => void;
}

export function Marker({ 
  x, 
  y, 
  id, 
  isActive = false, 
  isNumbered = false,
  onClick 
}: MarkerProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      whileHover={{ scale: 1.2 }}
      className={cn(
        "absolute w-6 h-6 rounded-full shadow-md border-2 border-white cursor-pointer transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-colors",
        isActive ? "bg-[#FF4081]" : "bg-[#FFA000]"
      )}
      style={{ 
        top: `${y}%`, 
        left: `${x}%`,
      }}
      onClick={onClick}
    >
      {isNumbered && (
        <span className="text-white text-xs font-bold">
          {id}
        </span>
      )}
    </motion.div>
  );
}
