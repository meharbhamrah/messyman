"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Share2, Award, BookOpen, Compass, Sparkles, 
  ChevronRight, Check, Heart, Users, TrendingUp, Zap,
  Calendar, Smile, Frown, Coffee, Home, Briefcase, Music,
  User, MessageCircle, Sun, Moon, CloudRain, Activity,
  Camera, MapPin, Headphones, Clock, Sunrise, Sunset
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { RevelationCrown } from "@/components/icons/RevelationCrown";
import { RevelationSparkle } from "@/components/icons/RevelationSparkle";

interface Memory {
  id: string;
  text: string;
  ai_summary: string;
  ai_emotions: string[];
  ai_topics: string[];
  ai_people: string[];
  ai_sentiment: number;
  photo_analysis: any;
  music_analysis: any;
  location_analysis: any;
  created_at: string;
}

interface ReportData {
  title: string;
  summary: string;
  sections: Array<{ heading: string; content: string }>;
  key_takeaway: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -30,
    scale: 0.96,
    transition: { duration: 0.3 },
  },
};

export default function InvestigationReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [insight, setInsight] = useState<any>(null);
  const [investigationTitle, setInvestigationTitle] = useState("");
  const [investigationQuestion, setInvestigationQuestion] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const unwrapped = await params;
      const id = unwrapped.id;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      await fetchReport(id);
      setLoading(false);
    };
    load();
  }, []);

  const fetchReport = async (invId: string) => {
    const { data: inv } = await supabase
      .from("investigations")
      .select("title, question")
      .eq("id", invId)
      .single();
    if (inv) {
      setInvestigationTitle(inv.title);
      setInvestigationQuestion(inv.question);
    }

    const { data: insights } = await supabase
      .from("insights")
      .select("*")
      .eq("type", "revelation")
      .eq("evidence->>investigation_id", invId)
      .limit(1);

    if (insights && insights.length > 0) {
      const insightData = insights[0];
      setInsight(insightData);
      const reportData = insightData.evidence?.report;
      if (reportData) {
        setReport(reportData);
      }
    }

    const { data: userInv } = await supabase
      .from("user_investigations")
      .select("current_memory_ids")
      .eq("investigation_id", invId)
      .limit(1);

    if (userInv && userInv.length > 0) {
      const ids = userInv[0].current_memory_ids || [];
      if (ids.length > 0) {
        const { data: mems } = await supabase
          .from("memories")
          .select("id, text, ai_summary, ai_emotions, ai_topics, ai_people, ai_sentiment, photo_analysis, music_analysis, location_analysis, created_at")
          .in("id", ids)
          .order("created_at", { ascending: true });
        if (mems) setMemories(mems);
      }
    }
  };

  useEffect(() => {
    if (report && memories.length > 0) {
      const builtCards = buildCards();
      setCards(builtCards);
      setTimeout(() => {
        if (builtCards.length > 0) setCurrentCard(0);
      }, 400);
    }
  }, [report, memories]);

  const buildCards = () => {
    const data = analyzeData();
    if (!data) return [];

    const builtCards: any[] = [];

    // 1. Hook – Surprising Stat
    if (data.topEmotion) {
      builtCards.push({
        id: "hook",
        icon: <RevelationCrown />,
        title: "Your Emotional Anchor",
        subtitle: `"${data.topEmotion.name}" – appeared ${data.topEmotion.count} times`,
        content: `"${data.topEmotion.name}" is the feeling that shows up most often in your writing. It's the color of your inner world. You experience it more than any other emotion, making it a central part of your story.`,
        stat: data.topEmotion.count,
        statLabel: "times",
        type: "stat",
      });
    }

    // 2. People – Rich details
    if (data.topPerson) {
      const sentimentLabel = data.topPerson.sentiment > 0.3 ? "warmly" : 
                             data.topPerson.sentiment < -0.2 ? "thoughtfully" : "neutrally";
      builtCards.push({
        id: "people",
        icon: <Users className="h-8 w-8 text-primary" />,
        title: "The People Who Matter",
        subtitle: `${data.topPerson.name} – ${data.topPerson.count} mentions`,
        content: `You write about ${data.topPerson.name} more than anyone else. They appear in ${data.topPerson.count} of your memories. You speak about them ${sentimentLabel}, suggesting a meaningful connection. They are a recurring presence in your life.`,
        stat: data.topPerson.count,
        statLabel: "mentions",
        type: "people",
      });
    }

    // 3. Emotions – Detailed emotional landscape
    if (data.emotions.length > 1) {
      const top2 = data.emotions.slice(0, 2);
      const top2Text = top2.map(e => `"${e.name}" (${e.count})`).join(" and ");
      builtCards.push({
        id: "emotions",
        icon: <Heart className="h-8 w-8 text-rose-500" />,
        title: "Your Emotional Landscape",
        subtitle: `${data.emotions.length} distinct emotions`,
        content: `You experience a rich emotional range – ${data.emotions.length} different feelings. The most common are ${top2Text}. This variety shows depth and complexity. You're not one-note; you feel deeply and fully.`,
        stat: data.emotions.length,
        statLabel: "emotions",
        type: "emotions",
      });
    }

    // 4. Surprising Pattern – Deep contradiction
    if (data.contradictions && data.contradictions.length > 0) {
      const c = data.contradictions[0];
      builtCards.push({
        id: "surprise",
        icon: <Zap className="h-8 w-8 text-amber-500" />,
        title: "A Surprising Pattern",
        subtitle: c.title,
        content: `${c.description} This duality is a sign of emotional intelligence. It means you're complex, and that's something to celebrate.`,
        type: "surprise",
      });
    }

    // 5. Topics – Deep dive
    if (data.topics.length > 0) {
      const topTopic = data.topics[0];
      builtCards.push({
        id: "topics",
        icon: <TrendingUp className="h-8 w-8 text-blue-500" />,
        title: "What's on Your Mind",
        subtitle: `"${topTopic.name}" – ${topTopic.count} mentions`,
        content: `You think about "${topTopic.name}" more than anything else. It appears in ${topTopic.count} of your memories, making it a recurring theme in your life. This is what you're processing, exploring, or navigating.`,
        stat: topTopic.count,
        statLabel: "times",
        type: "topics",
      });
    }

    // 6. Change Over Time
    if (data.sentimentChange !== null && Math.abs(data.sentimentChange) > 0.05) {
      const description = data.sentimentChange > 0
        ? `Your mood has improved by ${Math.round(data.sentimentChange * 100)}%. This is a meaningful shift. You're moving in a positive direction, and that's worth acknowledging.`
        : `Your mood has shifted by ${Math.round(Math.abs(data.sentimentChange) * 100)}%. This change is part of your journey. It's not good or bad – it just is. The important thing is you're paying attention.`;
      builtCards.push({
        id: "change",
        icon: <TrendingUp className="h-8 w-8 text-green-500" />,
        title: "How You've Changed",
        subtitle: data.sentimentChange > 0 ? "Mood is rising" : "Mood is shifting",
        content: description,
        type: "change",
      });
    }

    // 7. MUSIC INSIGHTS
    if (data.music && data.music.topArtist) {
      builtCards.push({
        id: "music",
        icon: <Headphones className="h-8 w-8 text-purple-500" />,
        title: "Your Soundtrack",
        subtitle: `Top artist: ${data.music.topArtist.name}`,
        content: `You listen to ${data.music.topArtist.name} more than any other artist. ${data.music.topArtist.count > 1 ? `They appear in ${data.music.topArtist.count} of your memories.` : ''} ${data.music.topGenre ? `Your go-to genre is ${data.music.topGenre}.` : ''} ${data.music.topMood ? `The music you listen to often feels ${data.music.topMood}.` : ''}`,
        stat: data.music.topArtist.count,
        statLabel: "plays",
        type: "music",
      });
    }

    // 8. PHOTO INSIGHTS
    if (data.photos && data.photos.topMood) {
      builtCards.push({
        id: "photos",
        icon: <Camera className="h-8 w-8 text-amber-500" />,
        title: "Through the Lens",
        subtitle: `${data.photos.totalPhotos} photos uploaded`,
        content: `You capture moments that feel ${data.photos.topMood}. ${data.photos.topScene ? `Most of your photos are of ${data.photos.topScene} scenes.` : ''} ${data.photos.topObjects ? `You often photograph ${data.photos.topObjects.slice(0, 2).join(' and ')}.` : ''}`,
        stat: data.photos.totalPhotos,
        statLabel: "photos",
        type: "photos",
      });
    }

    // 9. LOCATION INSIGHTS
    if (data.locations && data.locations.topType) {
      builtCards.push({
        id: "locations",
        icon: <MapPin className="h-8 w-8 text-green-500" />,
        title: "Where You Are",
        subtitle: `Top location: ${data.locations.topType}`,
        content: `You often find yourself at ${data.locations.topType} places. ${data.locations.topVibe ? `The vibe there is ${data.locations.topVibe}.` : ''} ${data.locations.totalLocations > 1 ? `You've been to ${data.locations.totalLocations} different types of places.` : ''}`,
        stat: data.locations.totalLocations,
        statLabel: "places",
        type: "locations",
      });
    }

    // 10. TIME PATTERNS
    if (data.timePatterns) {
      const bestDay = data.timePatterns.bestDay;
      const bestTime = data.timePatterns.bestTime;
      const avgGap = data.timePatterns.averageGap;
      
      if (bestDay || bestTime) {
        let timeContent = "Your writing has a rhythm. ";
        if (bestDay && bestTime) {
          timeContent += `You write most often on ${bestDay}s, especially during the ${bestTime}. `;
        } else if (bestDay) {
          timeContent += `You write most often on ${bestDay}s. `;
        } else if (bestTime) {
          timeContent += `You write most often during the ${bestTime}. `;
        }
        if (avgGap !== null) {
          timeContent += `On average, you write every ${avgGap} days. `;
        }
        timeContent += "This is when you're most reflective and present.";
        
        builtCards.push({
          id: "time",
          icon: <Clock className="h-8 w-8 text-cyan-500" />,
          title: "Your Rhythm",
          subtitle: bestDay && bestTime ? `${bestDay}s & ${bestTime}s` : "When you write",
          content: timeContent,
          type: "time",
        });
      }
    }

    // 11. DAY + EMOTION CORRELATION
    if (data.dayEmotionCorrelation) {
      const de = data.dayEmotionCorrelation;
      builtCards.push({
        id: "day-emotion",
        icon: <Sun className="h-8 w-8 text-yellow-500" />,
        title: "Day & Emotion",
        subtitle: `${de.day}s – "${de.emotion}"`,
        content: `On ${de.day}s, you often feel "${de.emotion}". This is your emotional rhythm – a pattern you might not have noticed.`,
        type: "day-emotion",
      });
    }

    // 12. TIME + TOPIC CORRELATION
    if (data.timeTopicCorrelation) {
      const tt = data.timeTopicCorrelation;
      builtCards.push({
        id: "time-topic",
        icon: <Sunset className="h-8 w-8 text-orange-500" />,
        title: "Time & Topic",
        subtitle: `${tt.time} – "${tt.topic}"`,
        content: `During the ${tt.time}, you often think about "${tt.topic}". Your environment shapes your thoughts.`,
        type: "time-topic",
      });
    }

    // 13. DAY + PEOPLE CORRELATION
    if (data.dayPeopleCorrelation) {
      const dp = data.dayPeopleCorrelation;
      builtCards.push({
        id: "day-people",
        icon: <Users className="h-8 w-8 text-indigo-500" />,
        title: "Day & People",
        subtitle: `${dp.day}s – ${dp.person}`,
        content: `You write about ${dp.person} most often on ${dp.day}s. This pattern shows how your relationships are tied to the rhythm of your week.`,
        type: "day-people",
      });
    }

    // 14. COMBINED INSIGHTS
    if (data.combined && data.combined.length > 0) {
      const comb = data.combined[0];
      builtCards.push({
        id: "combined",
        icon: <Sparkles className="h-8 w-8 text-indigo-500" />,
        title: "Surprising Connections",
        subtitle: comb.title,
        content: comb.description,
        type: "combined",
      });
    }

    // 15. Key Takeaway
    if (report?.key_takeaway) {
      builtCards.push({
        id: "takeaway",
        icon: <RevelationSparkle />,
        title: "Your Key Takeaway",
        subtitle: "What this means for you",
        content: `${report.key_takeaway} This insight is a gift. Carry it with you as you continue your journey of self-discovery.`,
        type: "takeaway",
      });
    }

    // 16. Emotional Journey Timeline
    if (memories.length > 3) {
      const sentimentTrend = memories.map((m, i) => ({
        index: i,
        sentiment: m.ai_sentiment || 0,
        label: m.ai_emotions?.[0] || "neutral",
      }));
      const highPoints = sentimentTrend.filter(s => s.sentiment > 0.3);
      const lowPoints = sentimentTrend.filter(s => s.sentiment < -0.3);
      let timelineText = "";
      if (highPoints.length > 0 && lowPoints.length > 0) {
        timelineText = `You had ${highPoints.length} emotional peaks and ${lowPoints.length} valleys. Your journey has been full of movement.`;
      } else if (highPoints.length > 0) {
        timelineText = `You've had ${highPoints.length} notable high points. You're someone who finds joy.`;
      } else if (lowPoints.length > 0) {
        timelineText = `You've had ${lowPoints.length} challenging moments. You're someone who feels deeply.`;
      } else {
        timelineText = "Your emotional journey has been steady. You're a stable presence in your own life.";
      }
      builtCards.push({
        id: "timeline",
        icon: <Activity className="h-8 w-8 text-indigo-500" />,
        title: "Your Emotional Journey",
        subtitle: `${memories.length} moments tracked`,
        content: timelineText,
        type: "timeline",
      });
    }

    return builtCards;
  };

  const analyzeData = () => {
    if (memories.length === 0) return null;

    // --- Text Analysis ---
    const personMap: Record<string, { count: number; sentiment: number }> = {};
    memories.forEach(m => {
      (m.ai_people || []).forEach(p => {
        if (!personMap[p]) personMap[p] = { count: 0, sentiment: 0 };
        personMap[p].count++;
        personMap[p].sentiment += m.ai_sentiment || 0;
      });
    });
    const people = Object.entries(personMap)
      .map(([name, data]) => ({ name, count: data.count, sentiment: data.sentiment / data.count }))
      .sort((a, b) => b.count - a.count);
    const topPerson = people.length > 0 ? people[0] : null;

    const emotionMap: Record<string, number> = {};
    memories.forEach(m => {
      (m.ai_emotions || []).forEach(e => {
        emotionMap[e] = (emotionMap[e] || 0) + 1;
      });
    });
    const emotions = Object.entries(emotionMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const topEmotion = emotions.length > 0 ? emotions[0] : null;

    const topicMap: Record<string, number> = {};
    memories.forEach(m => {
      (m.ai_topics || []).forEach(t => {
        topicMap[t] = (topicMap[t] || 0) + 1;
      });
    });
    const topics = Object.entries(topicMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const mid = Math.floor(memories.length / 2);
    const first = memories.slice(0, mid);
    const second = memories.slice(mid);
    const firstAvg = first.length > 0 ? first.reduce((s, m) => s + (m.ai_sentiment || 0), 0) / first.length : 0;
    const secondAvg = second.length > 0 ? second.reduce((s, m) => s + (m.ai_sentiment || 0), 0) / second.length : 0;
    const sentimentChange = secondAvg - firstAvg;

    const contradictions = [];
    const happy = memories.filter(m => (m.ai_sentiment || 0) > 0.3);
    const sad = memories.filter(m => (m.ai_sentiment || 0) < -0.3);
    if (happy.length > 0 && sad.length > 0) {
      contradictions.push({
        title: "Highs and Lows",
        description: `You experience both happiness (${happy.length} times) and sadness (${sad.length} times). This is the full spectrum of being human.`,
      });
    }
    if (topPerson && topPerson.sentiment > 0.4) {
      contradictions.push({
        title: `${topPerson.name}'s Impact`,
        description: `You feel positively about ${topPerson.name} – they appear in ${topPerson.count} of your memories.`,
      });
    }

    // --- Music Analysis ---
    const musicData = memories.filter(m => m.music_analysis).map(m => m.music_analysis);
    let musicInsights: any = null;
    if (musicData.length > 0) {
      const artistMap: Record<string, number> = {};
      const genreMap: Record<string, number> = {};
      const moodMap: Record<string, number> = {};
      musicData.forEach(m => {
        if (m.artist) artistMap[m.artist] = (artistMap[m.artist] || 0) + 1;
        if (m.genre) genreMap[m.genre] = (genreMap[m.genre] || 0) + 1;
        if (m.mood) moodMap[m.mood] = (moodMap[m.mood] || 0) + 1;
      });
      const topArtist = Object.entries(artistMap).sort((a,b) => b[1]-a[1])[0];
      const topGenre = Object.entries(genreMap).sort((a,b) => b[1]-a[1])[0];
      const topMood = Object.entries(moodMap).sort((a,b) => b[1]-a[1])[0];
      musicInsights = {
        topArtist: topArtist ? { name: topArtist[0], count: topArtist[1] } : null,
        topGenre: topGenre ? topGenre[0] : null,
        topMood: topMood ? topMood[0] : null,
        totalSongs: musicData.length,
      };
    }

    // --- Photo Analysis ---
    const photoData = memories.filter(m => m.photo_analysis).map(m => m.photo_analysis);
    let photoInsights: any = null;
    if (photoData.length > 0) {
      const moodMap: Record<string, number> = {};
      const sceneMap: Record<string, number> = {};
      const objectMap: Record<string, number> = {};
      photoData.forEach(p => {
        if (p.mood) moodMap[p.mood] = (moodMap[p.mood] || 0) + 1;
        if (p.scene) sceneMap[p.scene] = (sceneMap[p.scene] || 0) + 1;
        if (p.objects) {
          p.objects.forEach((obj: string) => {
            objectMap[obj] = (objectMap[obj] || 0) + 1;
          });
        }
      });
      const topMood = Object.entries(moodMap).sort((a,b) => b[1]-a[1])[0];
      const topScene = Object.entries(sceneMap).sort((a,b) => b[1]-a[1])[0];
      const topObjects = Object.entries(objectMap).sort((a,b) => b[1]-a[1]).slice(0, 3).map(([obj]) => obj);
      photoInsights = {
        topMood: topMood ? topMood[0] : null,
        topScene: topScene ? topScene[0] : null,
        topObjects: topObjects.length > 0 ? topObjects : null,
        totalPhotos: photoData.length,
      };
    }

    // --- Location Analysis ---
    const locationData = memories.filter(m => m.location_analysis).map(m => m.location_analysis);
    let locationInsights: any = null;
    if (locationData.length > 0) {
      const typeMap: Record<string, number> = {};
      const vibeMap: Record<string, number> = {};
      locationData.forEach(l => {
        if (l.type) typeMap[l.type] = (typeMap[l.type] || 0) + 1;
        if (l.vibe) vibeMap[l.vibe] = (vibeMap[l.vibe] || 0) + 1;
      });
      const topType = Object.entries(typeMap).sort((a,b) => b[1]-a[1])[0];
      const topVibe = Object.entries(vibeMap).sort((a,b) => b[1]-a[1])[0];
      locationInsights = {
        topType: topType ? topType[0] : null,
        topVibe: topVibe ? topVibe[0] : null,
        totalLocations: locationData.length,
      };
    }

    // --- Date & Time Analysis ---
    const dayMap: Record<string, number> = {};
    const timeMap: Record<string, number> = {};
    const dayEmotionMap: Record<string, Record<string, number>> = {};
    const dayTopicMap: Record<string, Record<string, number>> = {};
    const dayPeopleMap: Record<string, Record<string, number>> = {};
    const timeTopicMap: Record<string, Record<string, number>> = {};
    const timeEmotionMap: Record<string, Record<string, number>> = {};

    let totalDays = 0;
    const gaps: number[] = [];

    memories.forEach((m, index) => {
      const date = new Date(m.created_at);
      const day = date.getDay();
      const hour = date.getHours();
      const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][day];
      const timePeriod = hour < 6 ? 'Night' : hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
      
      dayMap[dayName] = (dayMap[dayName] || 0) + 1;
      timeMap[timePeriod] = (timePeriod[timePeriod] || 0) + 1;

      // Day + Emotion correlation
      (m.ai_emotions || []).forEach(e => {
        if (!dayEmotionMap[dayName]) dayEmotionMap[dayName] = {};
        dayEmotionMap[dayName][e] = (dayEmotionMap[dayName][e] || 0) + 1;
        if (!timeEmotionMap[timePeriod]) timeEmotionMap[timePeriod] = {};
        timeEmotionMap[timePeriod][e] = (timeEmotionMap[timePeriod][e] || 0) + 1;
      });

      // Day + Topic correlation
      (m.ai_topics || []).forEach(t => {
        if (!dayTopicMap[dayName]) dayTopicMap[dayName] = {};
        dayTopicMap[dayName][t] = (dayTopicMap[dayName][t] || 0) + 1;
        if (!timeTopicMap[timePeriod]) timeTopicMap[timePeriod] = {};
        timeTopicMap[timePeriod][t] = (timeTopicMap[timePeriod][t] || 0) + 1;
      });

      // Day + People correlation
      (m.ai_people || []).forEach(p => {
        if (!dayPeopleMap[dayName]) dayPeopleMap[dayName] = {};
        dayPeopleMap[dayName][p] = (dayPeopleMap[dayName][p] || 0) + 1;
      });

      // Gap between entries
      if (index > 0) {
        const prevDate = new Date(memories[index - 1].created_at);
        const gap = Math.round((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (gap > 0) gaps.push(gap);
      }
    });

    // Find best day (most entries)
    const bestDay = Object.entries(dayMap).sort((a,b) => b[1]-a[1])[0];
    const bestTime = Object.entries(timeMap).sort((a,b) => b[1]-a[1])[0];

    // Find day + emotion correlation
    let dayEmotionCorrelation: any = null;
    for (const [day, emotions] of Object.entries(dayEmotionMap)) {
      const top = Object.entries(emotions).sort((a,b) => b[1]-a[1])[0];
      if (top && top[1] > 1) {
        dayEmotionCorrelation = { day, emotion: top[0] };
        break;
      }
    }

    // Find time + topic correlation
    let timeTopicCorrelation: any = null;
    for (const [time, topics] of Object.entries(timeTopicMap)) {
      const top = Object.entries(topics).sort((a,b) => b[1]-a[1])[0];
      if (top && top[1] > 1) {
        timeTopicCorrelation = { time, topic: top[0] };
        break;
      }
    }

    // Find day + people correlation
    let dayPeopleCorrelation: any = null;
    for (const [day, people] of Object.entries(dayPeopleMap)) {
      const top = Object.entries(people).sort((a,b) => b[1]-a[1])[0];
      if (top && top[1] > 1) {
        dayPeopleCorrelation = { day, person: top[0] };
        break;
      }
    }

    // Calculate average gap
    const averageGap = gaps.length > 0 ? Math.round(gaps.reduce((a,b) => a+b, 0) / gaps.length) : null;

    const timePatterns = {
      bestDay: bestDay ? bestDay[0] : null,
      bestTime: bestTime ? bestTime[0] : null,
      averageGap: averageGap,
    };

    // --- Combined Insights ---
    const combinedInsights = [];
    if (photoData.length > 0 && topics.length > 0) {
      const photoMemories = memories.filter(m => m.photo_analysis);
      if (photoMemories.length > 0) {
        const photoTopics = photoMemories.flatMap(m => m.ai_topics || []);
        const topPhotoTopic = Object.entries(
          photoTopics.reduce((acc: Record<string, number>, t) => {
            acc[t] = (acc[t] || 0) + 1;
            return acc;
          }, {})
        ).sort((a,b) => b[1]-a[1])[0];
        if (topPhotoTopic && topPhotoTopic[1] > 1) {
          combinedInsights.push({
            title: "Photo + Text",
            description: `When you write about "${topPhotoTopic[0]}", you often upload photos. This shows you're capturing moments that matter.`,
          });
        }
      }
    }

    if (musicData.length > 0 && emotions.length > 0) {
      const musicMemories = memories.filter(m => m.music_analysis);
      if (musicMemories.length > 0) {
        const musicEmotions = musicMemories.flatMap(m => m.ai_emotions || []);
        const topMusicEmotion = Object.entries(
          musicEmotions.reduce((acc: Record<string, number>, e) => {
            acc[e] = (acc[e] || 0) + 1;
            return acc;
          }, {})
        ).sort((a,b) => b[1]-a[1])[0];
        if (topMusicEmotion && topMusicEmotion[1] > 1) {
          combinedInsights.push({
            title: "Music + Emotion",
            description: `When you feel "${topMusicEmotion[0]}", you often listen to music. It's your emotional companion.`,
          });
        }
      }
    }

    if (locationData.length > 0 && topics.length > 0) {
      const locationMemories = memories.filter(m => m.location_analysis);
      if (locationMemories.length > 0) {
        const locationTopics = locationMemories.flatMap(m => m.ai_topics || []);
        const topLocationTopic = Object.entries(
          locationTopics.reduce((acc: Record<string, number>, t) => {
            acc[t] = (acc[t] || 0) + 1;
            return acc;
          }, {})
        ).sort((a,b) => b[1]-a[1])[0];
        if (topLocationTopic && topLocationTopic[1] > 1) {
          combinedInsights.push({
            title: "Location + Text",
            description: `When you're at ${locationInsights?.topType || 'certain'} places, you often think about "${topLocationTopic[0]}". Your environment shapes your thoughts.`,
          });
        }
      }
    }

    // Add time + emotion correlation to combined if found
    if (dayEmotionCorrelation) {
      combinedInsights.push({
        title: "Day + Emotion",
        description: `On ${dayEmotionCorrelation.day}s, you often feel "${dayEmotionCorrelation.emotion}". This is your emotional rhythm.`,
      });
    }

    if (timeTopicCorrelation) {
      combinedInsights.push({
        title: "Time + Topic",
        description: `During the ${timeTopicCorrelation.time}, you often think about "${timeTopicCorrelation.topic}". Your environment shapes your thoughts.`,
      });
    }

    return {
      people,
      topPerson,
      emotions,
      topEmotion,
      topics,
      sentimentChange,
      contradictions,
      music: musicInsights,
      photos: photoInsights,
      locations: locationInsights,
      timePatterns,
      dayEmotionCorrelation,
      timeTopicCorrelation,
      dayPeopleCorrelation,
      combined: combinedInsights,
    };
  };

  const handleNext = () => {
    if (currentCard < cards.length - 1) {
      setCurrentCard(currentCard + 1);
    } else {
      setShowAll(true);
    }
  };

  const handlePrev = () => {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
    }
  };

  const handleShare = () => {
    if (!report) return;
    const text = `${report.title}\n\n${report.summary}\n\n— Messyman`;
    if (navigator.share) {
      navigator.share({
        title: `Messyman Revelation: ${report.title}`,
        text: text,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!report || memories.length === 0) {
    return (
      <div className="pb-24 md:pb-6">
        <Header />
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Revelation Found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Complete an investigation to unlock your revelation.
          </p>
          <Button onClick={() => router.push("/investigations")} className="mt-4">
            View Investigations
          </Button>
        </div>
      </div>
    );
  }

  const currentCardData = cards[currentCard];
  const totalCards = cards.length;

  return (
    <div className="pb-24 md:pb-6" ref={reportRef}>
      <Header />

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-secondary rounded-full transition-all duration-200 hover:scale-110"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" />
          <h1 className="text-xl font-bold">Revelation</h1>
        </div>
        <span className="text-xs text-muted-foreground bg-secondary/60 px-3 py-1 rounded-full ml-auto">
          {investigationTitle || "Completed"}
        </span>
      </div>

      <div className="max-w-2xl mx-auto">
        {!showAll && currentCardData ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCard}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-2xl border border-primary/10 shadow-lg p-8 md:p-10 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-6">
                <span>{currentCard + 1} / {totalCards}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span>Discovery</span>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200">
                  {currentCardData.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{currentCardData.title}</h2>
                  <p className="text-sm text-muted-foreground">{currentCardData.subtitle}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-base text-foreground/80 leading-relaxed">
                  {currentCardData.content}
                </p>
              </div>

              {currentCardData.stat && (
                <div className="flex justify-center mb-6">
                  <div className="inline-flex items-center gap-3 bg-primary/5 px-6 py-3 rounded-full border border-primary/10">
                    <span className="text-4xl font-bold text-primary">{currentCardData.stat}</span>
                    <span className="text-sm text-muted-foreground">{currentCardData.statLabel}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <button
                  onClick={handlePrev}
                  disabled={currentCard === 0}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Back
                </button>
                <button
                  onClick={handleNext}
                  className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  {currentCard === totalCards - 1 ? "See Full Report →" : "Next →"}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : !showAll && totalCards === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No insights available yet.</p>
          </div>
        ) : null}

        {showAll && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl border border-primary/10 shadow-lg p-8 md:p-10 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200">
                  <RevelationCrown />
                </div>
              </div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                {report.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">{investigationQuestion}</p>
            </div>

            <div className="mb-6 p-5 bg-secondary/20 rounded-xl border border-secondary/30 text-center">
              <p className="text-base text-foreground/80 leading-relaxed italic">
                {report.summary}
              </p>
            </div>

            <div className="space-y-4">
              {cards.map((card, idx) => (
                <div key={idx} className="bg-secondary/10 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-1.5 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200">
                      {card.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{card.title}</h3>
                      <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{card.content}</p>
                  {card.stat && (
                    <div className="mt-2 inline-flex items-center gap-2 bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                      <span className="text-xl font-bold text-primary">{card.stat}</span>
                      <span className="text-xs text-muted-foreground">{card.statLabel}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 p-5 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/10 text-center">
              <div className="flex justify-center mb-2">
                <RevelationSparkle />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Your Key Takeaway</p>
              <p className="text-base font-medium text-foreground leading-relaxed mt-1">
                {report.key_takeaway}
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/50">
              <div className="text-xs text-muted-foreground">
                {insight && <span>Revealed on {formatDate(insight.created_at)}</span>}
              </div>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    Share
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {!showAll && totalCards > 0 && (
          <div className="flex justify-center gap-2 mt-4">
            {cards.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentCard
                    ? 'w-6 bg-primary'
                    : idx < currentCard
                    ? 'w-2 bg-primary/40'
                    : 'w-2 bg-secondary'
                }`}
              />
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/investigations")}
          >
            <Compass className="h-4 w-4 mr-2" />
            All Investigations
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary-dark hover:to-primary text-white"
            onClick={() => router.push("/investigations")}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Next Journey
          </Button>
        </div>
      </div>
    </div>
  );
}
