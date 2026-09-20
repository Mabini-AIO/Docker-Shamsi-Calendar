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

                sb.Append("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//ShamsiServer//Calendar//FA\r\nCALSCALE:GREGORIAN\r\nX-WR-CALNAME:Shamsi Events\r\nREFRESH-INTERVAL;VALUE=DURATION:PT15M\r\nX-PUBLISHED-TTL:PT15M\r\n");

                foreach (var evt in db.GetEventsForIcs())
                {
                    sb.Append($"BEGIN:VEVENT\r\nUID:event-{evt.Id}@shamsi.local\r\nDTSTAMP:{DateTime.UtcNow:yyyyMMddTHHmmssZ}\r\n");
                    sb.Append($"DTSTART;VALUE=DATE:{evt.GregorianDate:yyyyMMdd}\r\nDTEND;VALUE=DATE:{evt.GregorianDate.AddDays(1):yyyyMMdd}\r\n");
                    sb.Append($"SUMMARY:{evt.Title}\r\nTRANSP:TRANSPARENT\r\nEND:VEVENT\r\n");
                }

                sb.Append("END:VCALENDAR\r\n");

                return Results.Text(sb.ToString(), "text/calendar; charset=utf-8");
            });
        }
    }
}
