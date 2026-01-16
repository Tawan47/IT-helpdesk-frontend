import React from 'react';
import { Check, Clock, UserCheck, Send, Sparkles } from 'lucide-react';

const statusConfig = {
  Submitted: {
    icon: Send,
    text: 'แจ้งเรื่องแล้ว',
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-500/10',
    text_color: 'text-blue-500 dark:text-blue-400',
    ring: 'ring-blue-500/30'
  },
  Assigned: {
    icon: UserCheck,
    text: 'มอบหมายงานแล้ว',
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-500/10',
    text_color: 'text-violet-500 dark:text-violet-400',
    ring: 'ring-violet-500/30'
  },
  'In Progress': {
    icon: Clock,
    text: 'กำลังดำเนินการ',
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-500/10',
    text_color: 'text-amber-500 dark:text-amber-400',
    ring: 'ring-amber-500/30'
  },
  Completed: {
    icon: Check,
    text: 'เสร็จสิ้น',
    gradient: 'from-emerald-500 to-green-600',
    bg: 'bg-emerald-500/10',
    text_color: 'text-emerald-500 dark:text-emerald-400',
    ring: 'ring-emerald-500/30'
  },
};

/**
 * A component to display the timeline of a ticket's status.
 * @param {{ ticket: object }} props - The ticket object containing logs.
 */
function TicketStatusTracker({ ticket }) {
  // Guard against undefined logs
  if (!ticket || !ticket.logs || !Array.isArray(ticket.logs)) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <h4 className="font-bold text-lg text-slate-900 dark:text-white">ไทม์ไลน์สถานะ</h4>
        </div>
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-6 text-center">
          <p className="text-slate-500 dark:text-slate-400">ไม่มีข้อมูลไทม์ไลน์</p>
        </div>
      </div>
    );
  }

  // Extract unique status change logs, keeping the first occurrence of each status
  const statusLogs = ticket.logs
    .filter(log => log.status) // Filter only logs that are status changes
    .reduce((acc, current) => {
      // If we haven't seen this status before, add it to our accumulator
      if (!acc.some(item => item.status === current.status)) {
        acc.push(current);
      }
      return acc;
    }, []);

  // Ensure 'Submitted' is always the first status if it exists in the logs
  const submittedLogIndex = statusLogs.findIndex(log => log.status === 'Submitted');
  if (submittedLogIndex > 0) {
    const [submittedLog] = statusLogs.splice(submittedLogIndex, 1);
    statusLogs.unshift(submittedLog);
  }

  const currentStatusIndex = Object.keys(statusConfig).indexOf(ticket.status);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <h4 className="font-bold text-lg text-slate-900 dark:text-white">ไทม์ไลน์สถานะ</h4>
      </div>

      <div className="relative">
        {/* Background line */}
        <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-full" />

        <div className="flex flex-col gap-1">
          {statusLogs.map((log, index) => {
            const config = statusConfig[log.status];
            if (!config) return null;

            const Icon = config.icon;
            const isLast = index === statusLogs.length - 1;
            const isActive = ticket.status === log.status || Object.keys(statusConfig).indexOf(log.status) < currentStatusIndex;
            const isCurrent = ticket.status === log.status;

            return (
              <div key={index} className="flex items-start gap-4 relative">
                {/* Icon */}
                <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 
                  ${isActive
                    ? `bg-gradient-to-br ${config.gradient} shadow-lg ring-4 ${config.ring}`
                    : 'bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600'}`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  {isCurrent && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full ring-2 ring-white dark:ring-slate-800 animate-pulse" />
                  )}
                </div>

                {/* Text Content */}
                <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
                  <div className={`rounded-xl p-3 transition-all ${isActive ? config.bg + ' border border-slate-200/50 dark:border-slate-700/50' : ''}`}>
                    <p className={`font-semibold ${isActive ? config.text_color : 'text-slate-400 dark:text-slate-500'}`}>
                      {config.text}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400">
                          ปัจจุบัน
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                      {new Date(log.timestamp).toLocaleString('th-TH')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TicketStatusTracker;
