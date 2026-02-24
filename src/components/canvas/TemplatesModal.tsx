import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Sparkles, FolderOpen, Video, Image as ImageIcon, Music, Type, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { useCanvasStore } from '@/lib/canvas-store';
import { v4 as uuidv4 } from 'uuid';

interface TemplatesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface TemplateRecord {
    id: string;
    filename: string;
    title: string;
    description: string;
    tags: string[];
    iconType: string;
}

const TEMPLATE_CATEGORIES = [
    { id: 'all', label: 'All Templates' },
    { id: 'video', label: 'Video Gen' },
    { id: 'social', label: 'Social Media' },
    { id: 'podcast', label: 'Podcast' },
];

export function TemplatesModal({ isOpen, onClose }: TemplatesModalProps) {
    const [activeCategory, setActiveCategory] = useState('all');
    const [templates, setTemplates] = useState<TemplateRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { workspaces, activeWorkspaceId, updateWorkspace, createWorkspace } = useWorkspaceStore();
    const { nodes, edges, setNodes, setEdges } = useCanvasStore();

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
        }
    }, [isOpen]);

    const fetchTemplates = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/templates');
            const data = await res.json();
            if (data.success) {
                setTemplates(data.templates);
            }
        } catch (err) {
            toast.error('Failed to load templates');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTemplateClick = async (filename: string, title: string) => {
        try {
            // Fetch the template JSON
            const res = await fetch(`/api/templates/load?filename=${encodeURIComponent(filename)}`);
            const data = await res.json();

            if (data.success && data.workflow) {
                // 1. Save current state
                if (activeWorkspaceId) {
                    updateWorkspace(activeWorkspaceId, { nodes, edges });
                }

                // 2. Load into canvas
                setNodes(data.workflow.nodes || []);
                setEdges(data.workflow.edges || []);

                toast.success(`Loaded "${title}" template`);
                onClose();
            } else {
                toast.error('Failed to load template payload');
            }
        } catch (err) {
            toast.error('Template loading failed');
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            toast.error('Please upload a .json workflow file');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/templates', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Template uploaded successfully!');
                fetchTemplates();
            } else {
                toast.error(data.error || 'Failed to upload template');
            }
        } catch (err) {
            toast.error('Upload failed');
        }

        // Clear input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-[#0a0a0a]/95 shadow-2xl backdrop-blur-xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border/50 p-6">
                        <div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-purple-400" />
                                Workflow Templates
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Start your next masterpiece with an AI-curated template
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".json"
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="group border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 transition-all"
                                onClick={handleUploadClick}
                            >
                                <Upload className="w-4 h-4 mr-2 group-hover:-translate-y-0.5 transition-transform" />
                                Upload Custom
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-white/10"
                                onClick={onClose}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-between items-start h-[500px]">
                        {/* Sidebar Categories */}
                        <div className="w-48 h-full border-r border-border/50 p-4 space-y-1 bg-background/30">
                            {TEMPLATE_CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                        activeCategory === cat.id
                                            ? "bg-purple-500/20 text-purple-300 font-medium"
                                            : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                    )}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Template Grid */}
                        <div className="flex-1 h-full p-6 overflow-y-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    Loading templates...
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                    <div className="p-4 rounded-full bg-white/5 border border-white/10">
                                        <FileJson className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-foreground">No templates found</h3>
                                        <p className="text-sm text-muted-foreground max-w-[250px] mt-1">
                                            Upload a favorite workflow JSON using the button top right.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    {templates.map((template, idx) => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            key={template.id}
                                            onClick={() => handleTemplateClick(template.filename, template.title)}
                                            className="group relative cursor-pointer overflow-hidden rounded-xl border border-border/50 bg-background/50 p-5 transition-all hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:-translate-y-1"
                                        >
                                            <div className={cn("absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500")} />

                                            <div className="relative z-10">
                                                <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-background/80 p-2.5 backdrop-blur-sm shadow-inner border border-white/5">
                                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                                </div>
                                                <h3 className="mb-1.5 font-semibold text-lg text-foreground group-hover:text-purple-300 transition-colors">
                                                    {template.title}
                                                </h3>
                                                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                                    {template.description}
                                                </p>

                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {template.tags.map(tag => (
                                                        <span key={tag} className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-medium text-muted-foreground group-hover:bg-purple-500/20 group-hover:text-purple-300 transition-colors">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
