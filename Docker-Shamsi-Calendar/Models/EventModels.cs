namespace Docker_Shamsi_Calendar.Models
{
    public record CalendarEvent(int Id, string Title, int Year, int Month, int Day, DateTime GregorianDate, bool IsHoliday, bool IsCustom, bool IsPermanent = false);
    public record AddEventRequest(string Title, int Year, int Month, int Day, bool IsHoliday, bool IsPermanent);
}