using Docker_Shamsi_Calendar.Models;
using Docker_Shamsi_Calendar.Services;
using System.Globalization;
using System.Text;

namespace Docker_Shamsi_Calendar.Endpoints
{
    public static class EventEndpoints
    {
        public static void MapEventEndpoints(this WebApplication app)
        {
            app.MapGet("/api/events", (int year, int month, DatabaseService db) => Results.Ok(db.GetEventsForMonth(year, month)));

            app.MapPost("/api/events", (AddEventRequest req, DatabaseService db) =>
            {
                if (string.IsNullOrWhiteSpace(req.Title) || req.Year <= 0 || req.Month <= 0 || req.Day <= 0) return Results.BadRequest();
                try
                {
                    var pc = new PersianCalendar();
                    DateTime gDate = pc.ToDateTime(req.Year, req.Month, req.Day, 0, 0, 0, 0);
                    db.SaveEvent(req.Title, req.Year, req.Month, req.Day, gDate, req.IsHoliday, isCustom: true);
                    return Results.Ok();
                }
                catch { return Results.BadRequest("Invalid Date"); }
            });

            app.MapDelete("/api/events/{id:int}", (int id, DatabaseService db) => db.DeleteCustomEvent(id) ? Results.Ok() : Results.NotFound());

            app.MapGet("/calendar.ics", (DatabaseService db) =>
            {
                var sb = new StringBuilder();
                sb.AppendLine("BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ShamsiServer//Calendar//FA\nCALSCALE:GREGORIAN\nX-WR-CALNAME:Shamsi Events\nREFRESH-INTERVAL;VALUE=DURATION:PT15M\nX-PUBLISHED-TTL:PT15M");
                foreach (var evt in db.GetEventsForIcs())
                {
                    sb.AppendLine($"BEGIN:VEVENT\nUID:event-{evt.Id}@shamsi.local\nDTSTAMP:{DateTime.UtcNow:yyyyMMddTHHmmssZ}");
                    sb.AppendLine($"DTSTART;VALUE=DATE:{evt.GregorianDate:yyyyMMdd}\nDTEND;VALUE=DATE:{evt.GregorianDate.AddDays(1):yyyyMMdd}");
                    sb.AppendLine($"SUMMARY:{evt.Title}\nTRANSP:TRANSPARENT\nEND:VEVENT");
                }
                sb.AppendLine("END:VCALENDAR");
                return Results.Text(sb.ToString(), "text/calendar; charset=utf-8");
            });
        }
    }
}
