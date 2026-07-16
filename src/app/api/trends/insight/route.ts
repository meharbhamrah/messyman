import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateStructuredDiscovery } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, period, type } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    console.log(`📊 [API] Checking ${type} insight for user: ${userId}, period: ${period}`);

    const supabase = await createClient();

    // Get today's date (local time)
    const today = new Date().toISOString().split('T')[0];

    // Check if we already have an insight for today
    const { data: existingInsight } = await supabase
      .from('insights')
      .select('id, insight_text, evidence, created_at')
      .eq('user_id', userId)
      .eq('type', 'trend')
      .eq('discovery_type', type === 'mood' ? 'mood_trend' : 'work_trend')
      .gte('created_at', today)
      .limit(1);

    // If we have a fresh insight from today, return it
    if (existingInsight && existingInsight.length > 0) {
      console.log(`✅ [API] Returning existing ${type} insight from today`);
      return NextResponse.json({
        success: true,
        data: {
          description: existingInsight[0].insight_text,
          evidence: existingInsight[0].evidence?.evidence || 'Based on your recent entries',
          type: type === 'mood' ? 'mood_trend' : 'work_trend',
          cached: true
        }
      });
    }

    console.log(`🔍 [API] Generating new ${type} insight...`);

    // Fetch memories with AI data
    const { data: memories } = await supabase
      .from('memories')
      .select('id, text, created_at, ai_sentiment, ai_emotions, ai_topics, ai_people, ai_activities, ai_places, ai_keywords')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (!memories || memories.length < 5) {
      return NextResponse.json({
        success: true,
        data: {
          description: 'Write more memories to unlock personalized insights. Each entry helps us understand you better.',
          evidence: 'You need at least 5 memories',
          type: type === 'mood' ? 'mood_trend' : 'work_trend',
          needs_more_data: true
        }
      });
    }

    // Filter by period
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const filtered = memories.filter(m => new Date(m.created_at) >= cutoff);

    if (filtered.length < 3) {
      return NextResponse.json({
        success: true,
        data: {
          description: `You need at least 3 memories in the ${period} period for a meaningful insight. Keep writing!`,
          evidence: `Only ${filtered.length} memories in this period`,
          type: type === 'mood' ? 'mood_trend' : 'work_trend',
          needs_more_data: true
        }
      });
    }

    // Build user data based on type
    const allEmotions = filtered.flatMap(m => m.ai_emotions || []);
    const allTopics = filtered.flatMap(m => m.ai_topics || []);
    const allPeople = filtered.flatMap(m => m.ai_people || []);

    const emotionCounts: Record<string, number> = {};
    const topicCounts: Record<string, number> = {};
    const personCounts: Record<string, number> = {};
    allEmotions.forEach(e => { emotionCounts[e] = (emotionCounts[e] || 0) + 1; });
    allTopics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
    allPeople.forEach(p => { personCounts[p] = (personCounts[p] || 0) + 1; });

    const userData = {
      memories: filtered,
      top_emotions: Object.entries(emotionCounts).sort((a,b) => b[1]-a[1]).slice(0,5).map(([e]) => e),
      top_topics: Object.entries(topicCounts).sort((a,b) => b[1]-a[1]).slice(0,5).map(([t]) => t),
      top_people: Object.entries(personCounts).sort((a,b) => b[1]-a[1]).slice(0,5).map(([p]) => p),
      period: period,
    };

    // Add type-specific data
    if (type === 'work') {
      const workTopics = ['work','job','career','boss','colleague','meeting','project'];
      const lifeTopics = ['family','friend','home','hobby','weekend','vacation','fun','love'];
      let workCount = 0, lifeCount = 0;
      allTopics.forEach(t => {
        const lower = t.toLowerCase();
        if (workTopics.some(w => lower.includes(w))) workCount++;
        if (lifeTopics.some(l => lower.includes(l))) lifeCount++;
      });
      userData.work_ratio = workCount / (workCount + lifeCount || 1);
      userData.purpose_mentions = filtered.flatMap(m => m.ai_keywords || [])
        .filter(k => ['meaning','purpose','goal','dream'].some(w => k.toLowerCase().includes(w))).length;
    }

    const discovery = await generateStructuredDiscovery(userData);

    // If no discovery generated or it's too generic
    if (!discovery || !discovery.description) {
      return NextResponse.json({
        success: true,
        data: {
          description: 'Your data is showing interesting patterns. Write a few more memories and check back for new insights.',
          evidence: 'Keep writing!',
          type: type === 'mood' ? 'mood_trend' : 'work_trend',
          needs_more_data: true
        }
      });
    }

    // Store the insight in the database
    const { error: insertError } = await supabase
      .from('insights')
      .insert({
        user_id: userId,
        insight_text: discovery.description,
        type: 'trend',
        discovery_type: type === 'mood' ? 'mood_trend' : 'work_trend',
        evidence: {
          ...discovery,
          period: period,
          generated_at: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error saving insight:', insertError);
    }

    return NextResponse.json({
      success: true,
      data: {
        description: discovery.description,
        evidence: discovery.evidence || 'Based on your recent entries',
        type: type === 'mood' ? 'mood_trend' : 'work_trend',
        cached: false
      }
    });

  } catch (error) {
    console.error('Error generating trend insight:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate insight'
    }, { status: 500 });
  }
}
