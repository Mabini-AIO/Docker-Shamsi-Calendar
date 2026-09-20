using HtmlAgilityPack;
using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;

namespace Docker_Shamsi_Calendar.Services
{
    public class TimeIrScraperService : BackgroundService
    {
        private readonly DatabaseService _db;

        public TimeIrScraperService(DatabaseService db)
        {
            _db = db;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                var pc = new PersianCalendar();
                int currentYear = pc.GetYear(DateTime.Now);

                if (_db.HasImportedEventsForYear(currentYear)) return;

                using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36");

                string[] urlsToTry = { "https://www.time.ir/event-year", $"https://www.time.ir/fa/event/year/{currentYear}" };
                int eventsAdded = 0;

                foreach (var url in urlsToTry)
                {
                    if (stoppingToken.IsCancellationRequested) break;

                    try
                    {
                        var html = await client.GetStringAsync(url, stoppingToken);
                        var doc = new HtmlDocument();
                        doc.LoadHtml(html);

                        var eventNodes = doc.DocumentNode.Descendants("div")
                            .Where(n => (n.Attributes["class"]?.Value ?? "").Contains("EventListItem") && (n.Attributes["class"]?.Value ?? "").Contains("__root") && !n.Attributes["class"]?.Value.Contains("__events") == true)
                            .ToList();

                        foreach (var node in eventNodes)
                        {
                            var dateNode = node.Descendants("span").FirstOrDefault(s => (s.Attributes["class"]?.Value ?? "").Contains("__date"));
                            var eventNode = node.Descendants("span").FirstOrDefault(s => (s.Attributes["class"]?.Value ?? "").Contains("__event"));

                            if (dateNode == null || eventNode == null) continue;

                            string dateText = Regex.Replace(WebUtility.HtmlDecode(dateNode.InnerText), @"\s+", " ").Trim();
                            string title = Regex.Replace(WebUtility.HtmlDecode(eventNode.InnerText), @"\s+", " ").Trim();
                            var match = Regex.Match(dateText, @"([۰-۹0-9]{1,2})\s*(فروردین|اردیبهشت|خرداد|تیر|اَمرداد|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)");

                            if (match.Success)
                            {
                                int day = int.Parse(ConvertPersianToEnglishDigits(match.Groups[1].Value));
                                int month = GetMonthNumber(match.Groups[2].Value.Trim());
                                bool isHoliday = (dateNode.Attributes["class"]?.Value ?? "").Contains("__holiday") || (eventNode.Attributes["class"]?.Value ?? "").Contains("__holiday");

                                if (month > 0 && day > 0 && !string.IsNullOrWhiteSpace(title) && !_db.EventExists(title, currentYear, month, day))
                                {
                                    DateTime gDate = pc.ToDateTime(currentYear, month, day, 0, 0, 0, 0);
                                    _db.SaveEvent(title, currentYear, month, day, gDate, isHoliday, isCustom: false);
                                    eventsAdded++;
                                }
                            }
                        }
                        if (eventsAdded > 0) break;
                    }
                    catch { }
                }
            }
            catch { }
        }

        private static string ConvertPersianToEnglishDigits(string input)
        {
            string[] persian = { "۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹" };
            string[] english = { "0", "1", "2", "3", "4", "5", "6", "7", "8", "9" };
            for (int i = 0; i < 10; i++) input = input.Replace(persian[i], english[i]);
            return input;
        }

        private static int GetMonthNumber(string m)
        {
            if (m == "اَمرداد") return 5;
            return new List<string> { "", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند" }.IndexOf(m);
        }
    }
}
