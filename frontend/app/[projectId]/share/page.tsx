"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ProjectState } from "../../api/projectService";
import { useParams } from "next/navigation";

export default function SharePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [state, setState] = useState<ProjectState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjectState() {
      try {
        // Use the same API endpoint as the main project page
        const response = await fetch(`https://do-collab-backend.not-a-single-bug.com/${projectId}/state`);

        if (!response.ok) {
          throw new Error(`Failed to load project: ${response.statusText}`);
        }

        const data = (await response.json()) as ProjectState;
        setState(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project");
        setLoading(false);
      }
    }

    fetchProjectState();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading e-card...</h2>
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="mb-6">{error || "Failed to load the e-card"}</p>
          <Link href="/">
            <Button>Create Your Own E-Card</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50 flex flex-col items-center justify-center">
      <div className="max-w-lg w-full">
        <h1 className="text-3xl font-bold text-center">Just for you</h1>
        <p className="text-xs text-center mb-8">(and everyone else who has this link)</p>

        {/* E-Card Preview */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div
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
        </Card>

        {/* Create Your Own Button */}
        <div className="text-center mt-8">
          <Link href="/">
            <Button size="lg" className="font-medium" variant="default">
              Create your own
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
