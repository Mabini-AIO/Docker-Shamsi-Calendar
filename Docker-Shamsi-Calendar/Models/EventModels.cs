namespace Docker_Shamsi_Calendar.Models
{
    public record AddEventRequest(string Title, int Year, int Month, int Day, bool IsHoliday = false);
    public record CalendarEvent(int Id, string Title, int Year, int Month, int Day, DateTime GregorianDate, bool IsHoliday, bool IsCustom);
}