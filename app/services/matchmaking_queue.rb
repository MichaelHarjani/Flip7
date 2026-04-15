class MatchmakingQueue
  QUEUE_KEY = "flip7_app:matchmaking_queue".freeze
  ENTERED_KEY = "flip7_app:matchmaking_entered_at".freeze

  class << self
    def add(user_id, elo)
      redis.zadd(QUEUE_KEY, elo.to_i, user_id.to_s)
      redis.hset(ENTERED_KEY, user_id.to_s, Time.current.to_i.to_s)
    end

    def remove(user_id)
      redis.zrem(QUEUE_KEY, user_id.to_s)
      redis.hdel(ENTERED_KEY, user_id.to_s)
    end

    def in_queue?(user_id)
      !redis.zscore(QUEUE_KEY, user_id.to_s).nil?
    end

    # Returns an array of [user_id, elo, wait_seconds] tuples for everyone
    # currently in the queue. Used by MatchmakingWorkerJob to apply the
    # expanding-range algorithm.
    def all_entries
      members = redis.zrange(QUEUE_KEY, 0, -1, with_scores: true)
      now = Time.current.to_i
      members.map do |user_id, elo|
        entered = redis.hget(ENTERED_KEY, user_id.to_s).to_i
        wait = now - entered
        [user_id.to_i, elo.to_i, wait]
      end
    end

    # Find the first opponent within `elo_range` of `elo` that is NOT
    # `user_id` itself. Returns the opponent's user_id or nil.
    def find_match(user_id, elo, elo_range)
      min = elo - elo_range
      max = elo + elo_range
      candidates = redis.zrangebyscore(QUEUE_KEY, min, max)
      candidates -= [user_id.to_s]
      candidates.first&.to_i
    end

    # Set entered_at timestamp directly. Used by tests to simulate queue
    # waiting time without sleeping.
    def set_entered_at(user_id, timestamp)
      redis.hset(ENTERED_KEY, user_id.to_s, timestamp.to_i.to_s)
    end

    def clear
      redis.del(QUEUE_KEY)
      redis.del(ENTERED_KEY)
    end

    private

    def redis
      @redis ||= Redis.new(url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"))
    end
  end
end
