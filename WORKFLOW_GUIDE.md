# Cambridge City FC Match Tracker — Improved Workflow ✅

## 📋 New Workflow (Just Deployed)

### **Phase 1: Coach Pre-Match Setup**

```
Fixture Setup 
  ↓
Select Starting XI (11 players)
  ↓
Select Substitutes (min. 1)
  ↓
Select Formation (1-4-4-2, etc.)
  ↓
TEAM SHEET PREVIEW ⭐ (NEW!)
```

### **Phase 2: Team Sheet Preview** ⭐ **THE KEY SCREEN**

Coach sees a beautiful team announcement showing:
- **Match Details:** Opponent, date, time, location, formation
- **Starting XI:** All 11 players positioned on pitch (visual formation diagram)
- **Substitutes:** Full list of available subs
- **Share Options:**
  - 📋 Copy shareable link → Send to parents
  - 🖨️ Print/PDF → Print out at ground
  - 🔗 Native share (iOS/Android)

**Parents receive:** Link to view team sheet before match (standalone, no match code needed)

### **Phase 3: Coach Publishes Team**

Coach confirms team is ready:
- Button: "✅ Team Confirmed → Start Match"
- Takes coach to **Select Stats Person** screen

### **Phase 4: Select Stats Person**

Coach picks **ONE** person to track the match:
- **Option 1:** Coach (me) — coach tracks everything
- **Option 2:** Select a parent/assistant from subs list — they track on their phone/tablet

**Why?** Control who's in the live match view, not a free-for-all

### **Phase 5: Live Match**

- **Coach:** Full control, records all events
- **Stats Person:** Tracks events on their device (if not coach)
- **Other Parents:** See read-only **Team Sheet** before match, **MOTM voting** after

### **Phase 6: Post-Match**

All parents get **MOTM voting screen**:
- Vote for Player of the Match
- See live vote counts
- View final ranked leaderboard

---

## 🎯 What Parents See

### **Before Match:**
- Shared team sheet link (shows full XI, subs, formation, match details)
- No live match access until coach starts

### **During Match:**
- Only **coach + stats person** see live events
- Other parents: Status message "Match in progress"

### **After Match:**
- All parents get MOTM voting screen
- Can vote + see live results

---

## 🔄 Comparison: Old vs New Workflow

| Step | Old | New |
|------|-----|-----|
| 1 | Setup match | Setup match |
| 2 | Select XI | Select XI |
| 3 | Formation | Formation |
| 4 | Go live immediately ❌ | **Team Sheet Preview** ✅ |
| 5 | - | **Share link/PDF with parents** ✅ |
| 6 | - | **Select stats person** ✅ |
| 7 | Live match (anyone can join) | Live match (controlled access) |
| 8 | MOTM voting | MOTM voting |

---

## 💡 Key Benefits

✅ **Team Announcement** — Beautiful, shareable team sheet (no waiting for match code)  
✅ **Controlled Tracking** — Only one person records events (not 20 parents)  
✅ **Print-Friendly** — Coaches can print/PDF team sheet for ground  
✅ **Standalone Link** — Parents view team before match (no app login needed)  
✅ **Professional** — Looks polished for parents on sideline  

---

## 📱 Team Sheet Features

**Shows:**
- Match opponent, date, time, location
- Formation type (1-4-4-2 etc.)
- Starting XI with positions on pitch
- Squad numbers + first names
- Full substitute list

**Sharable as:**
- Link (copy & paste, WhatsApp)
- PDF (print out)
- Native share (iOS/Android apps)

---

## 🎮 Coach Experience

1. **Setup match** → Standard form entry
2. **Select team** → Pick 11 starters + subs
3. **Formation** → Choose 1-4-4-2 etc.
4. **Preview** → See beautiful team sheet
5. **Share** → Copy link, print PDF, or native share
6. **Publish** → Confirm team ready
7. **Stats person** → Pick who tracks (or do it yourself)
8. **Go live** → Match starts, timer runs
9. **Summary** → Stats, export to sheets

---

## 👥 Parent Experience

### **Pre-Match:**
- Receive link: `https://...?teamSheet=TS-ABC123XYZ`
- Open in browser → See team announcement
- Shows XI, subs, formation, match details
- No live data, just the team sheet

### **During Match:**
- If they're "stats person" → See live match
- Otherwise → Wait for post-match

### **Post-Match:**
- Vote for MOTM
- See live voting results
- Others vote too, see leaderboard update

---

## 🚀 Live App

https://cambridge-city-fc.vercel.app/

**Test it:**
- Coach PIN: `1234`
- Flow: Setup → Team → Formation → **Team Sheet** (new!) → Stats Person → Live

---

## 📊 Technical Details

**New Components:**
- `Team Sheet Preview` screen with formation visualization
- `Select Stats Person` screen with parent list
- Shareable links via `teamSheetId` generation

**State Added:**
- `teamSheetId` — Unique shareable team sheet ID
- `statsPerson` — Designated tracker (Coach or parent ID)
- `teamPublished` — Workflow control flag

**Styling:**
- Print-friendly CSS (team sheet optimized for PDF)
- Mobile-responsive grids
- Formation pitch display (SVG)

---

## ✨ What's Next

The workflow is now **complete and production-ready**:

✅ Team setup (match details + lineup)  
✅ Formation selection  
✅ **Team sheet preview & sharing** ⭐ (NEW!)  
✅ **Stats person selection** ⭐ (NEW!)  
✅ Live match tracking (controlled access)  
✅ Post-match MOTM voting  
✅ Time-on-pitch tracking  
✅ Google Sheets export (optional)  

**Ready for your next match!** 🎯

---

**Commit:** `e499434`  
**Status:** ✅ Production Ready  
**Last Update:** 2026-08-12
