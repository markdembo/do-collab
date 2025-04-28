"use client";

import { COLORS, EMOJIS, SLOGANS, TEXT_SIZES } from "../../constants/projectOptions";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Share, Unlock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useRef, useState } from "react";

import Avatars from "../../components/Avatars";
import { Button } from "@/components/ui/button";
import Cursor from "../../components/Cursor";
import ExportButtons from "../../components/ExportButtons";
import Link from "next/link";
import NameInput from "../../components/NameInput";
import { SectionType } from "../api/projectService";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { useProjectService } from "../api/projectService";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const previewRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userColor, setUserColor] = useState<string>("#FF0000");
  const lastCursorUpdateRef = useRef<number>(0);
  const [hoveredSection, setHoveredSection] = useState<SectionType | null>(null);

  // Initialize project service
  const projectService = useProjectService(
    projectId,
    userName || "", // Provide empty string as fallback
    userColor
  );

  // Track mouse movement for cursor updates
  useEffect(() => {
    if (!userName) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Debounce to max 24 updates per second (approximately 41.67ms between updates)
      const now = Date.now();
      if (now - lastCursorUpdateRef.current >= 41.67) {
        projectService.updateCursor({ x: e.clientX, y: e.clientY });
        lastCursorUpdateRef.current = now;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [userName, projectService]);

  if (!userName) {
    return (
      <NameInput
        onSubmit={(name) => {
          setUserName(name);
          // Generate a random color for the user
          setUserColor(`#${Math.floor(Math.random() * 16777215).toString(16)}`);
        }}
      />
    );
  }

  const {
    state,
    cursors,
    updateState,
    lockSection,
    unlockSection,
    isSectionLockedByMe,
    isSectionLockedByOthers,
  } = projectService;

  // If state hasn't loaded yet, show loading
  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading project...</h2>
          <p>Connecting to the collaboration server</p>
        </div>
      </div>
    );
  }

  // Handle mouse enter for a section - just track hover, don't lock
  const handleSectionMouseEnter = (section: SectionType) => {
    setHoveredSection(section);
  };

  // Handle mouse leave for a section - clear hover state
  const handleSectionMouseLeave = (section: SectionType) => {
    if (hoveredSection === section) {
      setHoveredSection(null);
    }
  };

  // Handle lock toggle - called when lock icon is clicked
  const handleLockToggle = (section: SectionType) => {
    if (isSectionLockedByMe(section)) {
      unlockSection(section);
      toast.success(`You've unlocked the ${section} section`);
    } else {
      const lockInfo = isSectionLockedByOthers(section);
      if (lockInfo.locked) {
        toast.error(`This section is locked by ${lockInfo.userName}`);
        return;
      }
      lockSection(section);
      toast.success(`You've locked the ${section} section`);
    }
  };

  // Helper to check if an interaction with a section is allowed
  const canInteractWithSection = (section: SectionType): boolean => {
    const lockInfo = isSectionLockedByOthers(section);
    if (lockInfo.locked) {
      toast.error(`This section is being edited by ${lockInfo.userName}`);
      return false;
    }
    return true;
  };

  // Get background color for a section based on lock status
  const getSectionBackground = (section: SectionType): string => {
    // If locked by me, use a light version of my color
    if (isSectionLockedByMe(section)) {
      // Convert hex color to RGB and add opacity
      const hexColor = userColor.replace("#", "");
      const r = parseInt(hexColor.substring(0, 2), 16);
      const g = parseInt(hexColor.substring(2, 4), 16);
      const b = parseInt(hexColor.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, 0.25)`;
    }

    // If locked by someone else, use their color
    const lockInfo = isSectionLockedByOthers(section);
    if (lockInfo.locked && lockInfo.userColor) {
      const hexColor = lockInfo.userColor.replace("#", "");
      const r = parseInt(hexColor.substring(0, 2), 16);
      const g = parseInt(hexColor.substring(2, 4), 16);
      const b = parseInt(hexColor.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, 0.15)`;
    }

    // Default background
    return "transparent";
  };

  // Handlers for state changes
  const handleSloganChange = async (slogan: string) => {
    if (!canInteractWithSection("slogan")) return;

    const success = await updateState({ slogan });
    if (!success) {
      // If update failed, revert back to the current state
      // No need to do anything as the current state will remain unchanged
    }
  };

  const handleEmojiClick = async (emoji: string) => {
    if (!canInteractWithSection("emojis")) return;

    let newEmojis;
    if (state.emojis.includes(emoji)) {
      newEmojis = state.emojis.filter((e) => e !== emoji);
    } else if (state.emojis.length < 3) {
      newEmojis = [...state.emojis, emoji];
    } else {
      return; // No change if already at max
    }
    await updateState({ emojis: newEmojis });
  };

  const handleBackgroundChange = async (backgroundColor: string) => {
    if (!canInteractWithSection("backgroundColor")) return;

    await updateState({ backgroundColor });
  };

  const handleForegroundChange = async (foregroundColor: string) => {
    if (!canInteractWithSection("foregroundColor")) return;

    await updateState({ foregroundColor });
  };

  const handleTextSizeChange = async (textSize: string) => {
    if (!canInteractWithSection("textSize")) return;

    await updateState({ textSize });
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <Toaster />
      <Cursor name={userName} color={userColor} />

      {/* Render other users' cursors */}
      {Object.entries(cursors)
        .filter(([name]) => name !== userName)
        .map(([name, position]) => {
          // Find the user in active users to get their color
          const user = state.activeUsers.find((u) => u.name === name);
          return user ? (
            <Cursor key={name} name={name} color={user.color} position={position} />
          ) : null;
        })}

      <Avatars users={state.activeUsers} />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">E-Card Generator</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Controls Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Customize Your E-Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className="space-y-2 p-2 rounded transition-colors relative"
                style={{ backgroundColor: getSectionBackground("slogan") }}
                onMouseEnter={() => handleSectionMouseEnter("slogan")}
                onMouseLeave={() => handleSectionMouseLeave("slogan")}
              >
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Choose Slogan</label>

                  {/* Reserve space for lock icon to prevent layout shifting */}
                  <div className="h-8 w-8">
                    {(hoveredSection === "slogan" || isSectionLockedByMe("slogan")) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleLockToggle("slogan")}
                            >
                              {isSectionLockedByMe("slogan") ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Unlock className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isSectionLockedByMe("slogan")
                              ? "Unlock section"
                              : "Lock section for editing"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                <Select value={state.slogan} onValueChange={handleSloganChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a slogan" />
                  </SelectTrigger>
                  <SelectContent>
                    {SLOGANS.map((slogan) => (
                      <SelectItem key={slogan} value={slogan}>
                        {slogan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div
                className="space-y-2 p-2 rounded transition-colors relative"
                style={{ backgroundColor: getSectionBackground("emojis") }}
                onMouseEnter={() => handleSectionMouseEnter("emojis")}
                onMouseLeave={() => handleSectionMouseLeave("emojis")}
              >
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Select Emojis (max 3)</label>

                  {/* Reserve space for lock icon to prevent layout shifting */}
                  <div className="h-8 w-8">
                    {(hoveredSection === "emojis" || isSectionLockedByMe("emojis")) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleLockToggle("emojis")}
                            >
                              {isSectionLockedByMe("emojis") ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Unlock className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isSectionLockedByMe("emojis")
                              ? "Unlock section"
                              : "Lock section for editing"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map((emoji) => (
                    <Button
                      key={emoji}
                      variant={state.emojis.includes(emoji) ? "default" : "outline"}
                      size="icon"
                      className="text-2xl"
                      onClick={() => handleEmojiClick(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>

              <div
                className="space-y-2 p-2 rounded transition-colors relative"
                style={{ backgroundColor: getSectionBackground("backgroundColor") }}
                onMouseEnter={() => handleSectionMouseEnter("backgroundColor")}
                onMouseLeave={() => handleSectionMouseLeave("backgroundColor")}
              >
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Background Color</label>

                  {/* Reserve space for lock icon to prevent layout shifting */}
                  <div className="h-8 w-8">
                    {(hoveredSection === "backgroundColor" ||
                      isSectionLockedByMe("backgroundColor")) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleLockToggle("backgroundColor")}
                            >
                              {isSectionLockedByMe("backgroundColor") ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Unlock className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isSectionLockedByMe("backgroundColor")
                              ? "Unlock section"
                              : "Lock section for editing"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COLORS.backgrounds.map((color) => (
                    <Button
                      key={color.name}
                      variant="outline"
                      size="icon"
                      className={`w-8 h-8 rounded-full ${
                        state.backgroundColor === color.value
                          ? "ring-2 ring-offset-2 ring-blue-500"
                          : ""
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => handleBackgroundChange(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div
                className="space-y-2 p-2 rounded transition-colors relative"
                style={{ backgroundColor: getSectionBackground("foregroundColor") }}
                onMouseEnter={() => handleSectionMouseEnter("foregroundColor")}
                onMouseLeave={() => handleSectionMouseLeave("foregroundColor")}
              >
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Text Color</label>

                  {/* Reserve space for lock icon to prevent layout shifting */}
                  <div className="h-8 w-8">
                    {(hoveredSection === "foregroundColor" ||
                      isSectionLockedByMe("foregroundColor")) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleLockToggle("foregroundColor")}
                            >
                              {isSectionLockedByMe("foregroundColor") ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Unlock className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isSectionLockedByMe("foregroundColor")
                              ? "Unlock section"
                              : "Lock section for editing"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COLORS.foregrounds.map((color) => (
                    <Button
                      key={color.name}
                      variant="outline"
                      size="icon"
                      className={`w-8 h-8 rounded-full ${
                        state.foregroundColor === color.value
                          ? "ring-2 ring-offset-2 ring-blue-500"
                          : ""
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => handleForegroundChange(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div
                className="space-y-2 p-2 rounded transition-colors relative"
                style={{ backgroundColor: getSectionBackground("textSize") }}
                onMouseEnter={() => handleSectionMouseEnter("textSize")}
                onMouseLeave={() => handleSectionMouseLeave("textSize")}
              >
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Text Size</label>

                  {/* Reserve space for lock icon to prevent layout shifting */}
                  <div className="h-8 w-8">
                    {(hoveredSection === "textSize" || isSectionLockedByMe("textSize")) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleLockToggle("textSize")}
                            >
                              {isSectionLockedByMe("textSize") ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Unlock className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isSectionLockedByMe("textSize")
                              ? "Unlock section"
                              : "Lock section for editing"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                <Select value={state.textSize} onValueChange={handleTextSizeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select text size" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEXT_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Preview</CardTitle>
              <ExportButtons previewRef={previewRef} backgroundColor={state.backgroundColor} />
            </CardHeader>
            <CardContent>
              <div
                ref={previewRef}
                className="aspect-[4/3] rounded-lg flex flex-col items-center justify-center p-8"
                style={{ backgroundColor: state.backgroundColor }}
              >
                <div
                  className={`text-center font-serif ${
                    state.textSize === "small"
                      ? "text-xl"
                      : state.textSize === "medium"
                      ? "text-2xl"
                      : "text-3xl"
                  }`}
                  style={{ color: state.foregroundColor }}
                >
                  {state.slogan}
                </div>
                <div className="mt-4 text-3xl">{state.emojis.join(" ")}</div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-row items-center justify-center">
              {projectId && (
                <Link href={`/${projectId}/share`}>
                  <Button variant="outline" size="sm">
                    <Share className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </Link>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
