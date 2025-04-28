"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NameInputProps {
  onSubmit: (name: string) => void;
}

export default function NameInput({ onSubmit }: NameInputProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Welcome to E-Card Generator</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Please enter your name
            </label>
            <Input id="name" name="name" required placeholder="Your name" autoFocus />
          </div>
          <Button type="submit" className="w-full">
            Start Creating
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
