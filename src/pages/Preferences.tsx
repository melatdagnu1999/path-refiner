import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getPreferences, setPreferences, UserPreferences } from "@/lib/preferences";
import { Save, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

export default function Preferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(() => getPreferences());

  const update = <K extends keyof UserPreferences>(k: K, v: UserPreferences[K]) =>
    setPrefs((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    setPreferences(prefs);
    toast.success("Preferences saved — AI will personalize accordingly");
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-primary" />
          Personal Preferences
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Help the AI personalize your plans, motivation, and guidance.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Motivation Style</Label>
          <RadioGroup
            value={prefs.motivationStyle}
            onValueChange={(v) => update("motivationStyle", v as UserPreferences["motivationStyle"])}
            className="grid grid-cols-2 gap-2"
          >
            {[
              { v: "story", l: "Story-based" },
              { v: "tough-love", l: "Tough love" },
              { v: "gentle", l: "Gentle & supportive" },
              { v: "data-driven", l: "Data-driven" },
            ].map((o) => (
              <label key={o.v} className="flex items-center gap-2 border border-border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value={o.v} id={o.v} />
                <span className="text-sm">{o.l}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Favorite Books</Label>
          <Textarea
            placeholder="Atomic Habits, Deep Work, The Bible..."
            value={prefs.favoriteBooks}
            onChange={(e) => update("favoriteBooks", e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Study Interests</Label>
          <Textarea
            placeholder="Machine learning, history, philosophy..."
            value={prefs.studyInterests}
            onChange={(e) => update("studyInterests", e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Sports</Label>
          <Input
            placeholder="Tennis, running, swimming..."
            value={prefs.sports}
            onChange={(e) => update("sports", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Spiritual Preference</Label>
          <Input
            placeholder="Christian (Protestant), prayer + scripture daily..."
            value={prefs.spiritualPreference}
            onChange={(e) => update("spiritualPreference", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Hobbies</Label>
          <Textarea
            placeholder="Dressmaking, photography, cooking..."
            value={prefs.hobbies}
            onChange={(e) => update("hobbies", e.target.value)}
            rows={2}
          />
        </div>

        <Button onClick={handleSave} className="w-full gap-2">
          <Save className="h-4 w-4" /> Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}
