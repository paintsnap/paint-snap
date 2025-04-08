import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Annotation } from "@shared/schema";
import { Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnnotationCardProps {
  annotation: Annotation;
  isActive?: boolean;
  isNumbered?: boolean;
  onEdit: (id: number, title: string, content: string) => void;
  onDelete: (id: number) => void;
}

export function AnnotationCard({
  annotation,
  isActive = false,
  isNumbered = false,
  onEdit,
  onDelete
}: AnnotationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(annotation.title);
  const [content, setContent] = useState(annotation.content);

  const handleSave = () => {
    onEdit(annotation.id, title, content);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitle(annotation.title);
    setContent(annotation.content);
    setIsEditing(false);
  };

  return (
    <Card className={cn(
      "bg-white border-gray-200 shadow-sm transition-all",
      isActive && "border-[#FF4081]"
    )}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div 
              className={cn(
                "w-4 h-4 rounded-full flex-shrink-0",
                isActive ? "bg-[#FF4081]" : "bg-[#FFA000]"
              )}
            >
              {isNumbered && (
                <div className="w-6 h-6 rounded-full bg-[#FFA000] flex items-center justify-center text-white text-xs font-bold">
                  {annotation.id}
                </div>
              )}
            </div>
            {!isEditing ? (
              <h4 className="ml-2 text-sm font-medium font-sans">{annotation.title}</h4>
            ) : (
              <input
                type="text"
                className="ml-2 text-sm font-medium w-full border-b border-gray-300 focus:border-primary focus:outline-none px-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            )}
          </div>
          {!isEditing ? (
            <div className="flex space-x-1">
              <button 
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setIsEditing(true)}
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button 
                className="text-gray-400 hover:text-red-600"
                onClick={() => onDelete(annotation.id)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
        
        {!isEditing ? (
          <p className="mt-2 text-sm text-gray-600">{annotation.content}</p>
        ) : (
          <div className="mt-3">
            <Textarea
              className="w-full text-sm resize-none"
              rows={3}
              placeholder="Add your description..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex justify-end mt-2 space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={title.trim() === '' || content.trim() === ''}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
